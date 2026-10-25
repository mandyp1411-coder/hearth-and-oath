import {MAX_SAVE_FILE_BYTES} from './save-limits.js';
import { beginUiMeasure } from './ui-metrics.js';
import { routineOffers, routineReview, executeRoutine } from './routine-planner.js';
import { lifeChapterView, renderLifeContext, renderIndependentLives } from './life-context.js';
import { attributePointBudget } from './starting-attributes.js';
import { nextRunestone, runestoneStatus } from './runestone-ui.js';
import { pronounDisplayLabel } from './identity-labels.js';
import { createPersonalNoteDrafts } from './personal-note-drafts.js';
import { renderHerbalCareReview } from './herbal-care-ui.js';
import { herbalCareQuote } from './engine.js';
import { renderTournamentCard } from './adult-tournament-ui.js';
import { isTournamentBattle,DUEL_RULES_TEXT } from './tournament-duel-rules.js';
import { renderFieldPotionTreatment } from './field-treatment-ui.js';
import { personalNoteRows, reviewPersonalNote, personalNoteOwner } from './personal-notes.js';
import { renderPersonalNoteReview } from './personal-notes-ui.js';
import { buildBattleReadModel, renderBattleWorkspace } from './battle-ui.js';
import { TACTICS_LESSONS, TACTICS_PRACTICE_NOTICE } from './tactics-practice.js';
import { createTacticsPracticeController } from './tactics-practice-session.js';
import { sceneUtilityTab, sceneReturnForNavigation, validSceneReturn } from './scene-return.js';
import { originChoiceReason } from './family-origins.js';
import { researchChoiceQuote } from './research-runtime.js';
import { saveHealthView, renderSaveHealth } from './save-health-ui.js';
import { AGE_UP_HELP, firstDayGuideVisible, firstDayGuideView, firstDayGuideCommand, firstDayGuideFocusSelectors, dismissFirstDayGuide } from './first-day-guide.js';
import { renderFirstDayGuide } from './first-day-guide-ui.js';
import { serviceMeetingOffers } from './world-services-ui.js';
import { returnLifeCardView, returnLifeSourceNote } from './return-life-cards.js';
import { renderLatestExpeditionReceipt, expeditionGearSelection } from './maze-receipt-ui.js';
import { renderCombatStatuses, renderEnemyPrediction } from './combat-status-ui.js';
import { companionCombatProfile } from './companion-combat-profile.js';
import { renderCompanionCombatProfile } from './companion-combat-ui.js';
import { isMazeEntry } from './maze-rules.js';
import { actionCostDetails, actionCostSummary, householdAccrualText } from './action-costs.js';
import { currentCraftSession, newCraftSession, craftRows, craftQuote, CRAFTING_TABS } from './crafting-ui.js';
import { homePurchasePreview } from './home-ownership.js';
import { renderHomePurchase } from './home-ui.js';
import { notificationsFor, unreadNotifications, markNotificationsRead } from './notifications-v40.js';
import { renderInbox, renderNotificationToasts } from './notifications-ui-v40.js';
import { observationalInfancy } from './development.js';
import { roleTitle } from './interaction-ui-v40.js';
import { paperMapSheets } from './paper-map.js';
import { renderMaze } from './maze-ui-v31.js';
import { renderDelve } from './delve-ui.js';
import { renderField, battlecraftPanel } from './field-ui.js';
import { battlecraftView, bestiaryView, treeView, battlecraftRightNow } from './battlecraft.js';
import { currentMazeMapSession, mazeMapView, mazeRouteSummary } from './maze-map-ui.js';
import { mazeLayout } from './maze-v31.js';
import { renderActivities, ACTIVITY_TABS, schoolingPanel } from './activities-v31.js';
import { visitService, useConsumable, consumableReason, fieldPotionQuote, keepPlayerNote, editPlayerNote, archivePlayerNote, updateMazeMapMemory, exploreTravelPreview, startExploreJourney, continueExploreJourney, continueFamiliarJourney, stopExploreJourney } from './engine.js';
import { renderTravelMap } from './explore-map-v34.js';
import { settlementServices } from './world-services.js';
import {homeRestReason} from './home-recovery-v38.js';
import { installInventoryDrag } from './inventory-drag.js';
import { renderSimpleJournal } from './journal-ui-v30.js';
import { cartographyView, currentPlaceSummary } from './cartography.js';
import { installMapCamera } from './map-camera.js';
import { currentShopSession } from './shop-ui.js';
import { tradeInventory, shopAccessReason, newTradeDraft, quoteTrade } from './trading.js';
import { completeTrade } from './engine.js';
import { renderDungeonCrawler } from './dungeon-crawler-ui.js';
import { formatPlaceMarkup, properPlaceName } from './presentation-names.js';
import { inventoryEntries } from './inventory-ui.js';
import { WORKSPACE_SECTIONS, workspaceSection, selectSection, renderWorkspaceNavigation } from './interface-workspaces.js';
import { peopleRecordPage, renderPeopleRecords } from './people-records.js';
import { supernaturalNotes } from './supernatural-ui.js';
import { nightDiscoveryView } from './supernatural-discovery.js';
import { renderCourseRecords, renderSchoolTransfer } from './education-ui.js';
import { renderEndingLosses } from './ending-losses.js';
import { personalServicesPanel } from './personal-services.js';
import { SLOT_NAMES, EQUIPMENT_SLOTS } from './gear-loot.js';
import { ECONOMY_GOALS, renderEconomyPlan } from './economy-planning.js';
import { renderRoadPlanPanel, renderRoadJourney } from './travel-ui.js';
import { renderRadiantPanel } from './radiant-ui.js';
import { radiantView } from './radiant-descent.js';
import { BUILD_GOALS, equipmentComparator } from './gear-comparison.js';
import { renderEquipmentComparison } from './equipment-comparison-ui.js';
import { gearPreset, gearPresetFingerprint } from './gear-organizer.js';
import { renderGearPresetReview } from './gear-organizer-ui.js';
import { gearOrganizerCommand } from './engine.js';
import { combatOutlook, encounterOutlook, combatTrainingView, defeatGuidance } from './combat-guidance.js';
import { resistanceReadout } from './combat-rules.js';
import { renderQuestJournal } from './quest-journal.js';
import { trackedQuest, questReturnForecast, retirementQuestReview } from './quest-records.js';
import { upbringingPanel } from './upbringing.js';
import { spatialMoveOffer, renderAreaScene } from './area-scenes.js';
import { depthPanel, depthDungeonPanel } from './depth-ui-v27.js';
import { healthChoiceReason, healthView } from './health.js';
import { storyChoiceReason } from './life-stories.js';
import { lifeChoiceReason } from './life.js';
import { societyCustomerContext, societyCustomerChoiceQuote, societyCustomerChoiceReason } from './society.js';
import { companionRole, personalReadiness } from './people-context.js';
import { currentPlaceDescription } from './law-text-v25.js';
import { projectSupplyGuide } from './workshop.js';
import { partyPreparation } from './combat.js';
import { curseView,curseCombatNote } from './curses.js';
import { renderExplorationWorkspace, renderSettlementList, settlementWalkPath } from './exploration-ui.js';
import { renderConversationPanel, nearbyContacts } from './dialogue-ui-v22.js';
import { renderPackWorkspace } from './pack-ui-v28.js';
import { hexAtlas, cityRooms } from './cartography.js';
import { readDisplay, saveDisplay, applyDisplay, displayPreset, readWorkspace, saveWorkspace } from './display.js';
import { personalityImpactText, personalityTrait } from './personality.js';
import { voiceActions, voiceEvent, chapterHeading, whatMatters } from './voice.js';
import { rulesLabel, rulesNote, oldRules, exportFileName, OLD_RULES_DOOR, OLD_RULES_BACKUP_DOOR } from './edition.js';
import { admissionPolicy, storedLifeDecoder } from './rulebook.js';
import { ARCHIVE_URL, ARCHIVE_NAME } from './archive-link.js';
import { createLifeEntry, LIFE_ENTRY_REFUSED, LIFE_ENTRY_CANCELLED } from './life-entry.js';
import { schoolingView } from './schooling.js';
import { livingView } from './living-world.js';
import { farmView } from './farmer.js';
import { farmerDayVisible, renderFarmerDay, renderFarmerScene, renderFarmerBook } from './farmer-ui.js';
import { renderPersonalityPanel, renderTraitSelection } from './personality-ui.js';
import { regionalNamingLore } from './names.js';
import { regionAt } from './realm.js';
import { createLifeAtAge } from './new-life.js';
import { createOfflineDownload } from './offline-download.js';
import { renderOfflineDownload, updateOfflineDownload } from './offline-download-ui.js';
import { originById, startingAgeDescription } from './origins.js';
import { renderCreatorPortraitControls, renderCreatorOriginOptions, renderCreatorReview } from './creator.js';
import { appearanceAtAge } from './avatar.js';
import { createBirthGame, ageUp, liveSeason, attendBloodHunger, continueAgeUp, getAgeUnlocks, getLifeStage, replyMessage, getActions, updateRomanticIdentity, chooseAction, chooseEventOption, recruitCompanion, toggleCompanion, resolveBattle, migrateSave, validateSave, continueYear, equipGear, getMoonForecast, updatePreferences, continueAsChild, updateTravelPlan, companionActionReason, equipmentActionReason, getLifeCommitment } from './engine.js';
import { getBattleActions, takeBattleAction, previewBattleAction, battleActorDisplayName, battleNamedTargetId } from './combat.js';
import { renderEnemyPortrait } from './enemies.js';
import { renderPortraitGallery, findCurrentPortrait } from './portrait-gallery.js';
import { effectiveHeritage } from './portrait-library.js';
import { selectCharacterPortrait, declareCharacterHeritage, portraitSelectionReason, choosePersonalityTrait, chooseBattleAction } from './engine.js';
import { merchantPanel, adventurePage, realmPage } from './rpg-ui.js';
import { renderAvatar, describeAppearance } from './avatar.js';
import { campaignView } from './campaign.js';
import { dungeonView } from './exploration.js';
import { getContacts, rememberedContacts } from './conversations.js';
import { classView } from './classes.js';
import { travelPreview, BIRTHPLACES, worldCalendarContext } from './world.js';
import { renderWorldMap, animateMapMovement, getMapMovement, centerWorldMap } from './map.js';
import { GEAR_CATALOG, gearBonuses } from './gear.js';
import { householdView, educationTransferPreview } from './household.js';
import { workshopView, workshopTier } from './workshop.js';
import { loreView } from './lore.js';
import { preferenceFields, preferencesFromForm, preferenceView } from './preferences.js';
import { careerPage, healthPage, legacyPage, careerBatchPanel, householdBudgetPanel } from './dynasty-ui.js';
import { travelPlanPreview, travelEncounterPerson } from './travel.js';
import { getAudioSettings, setSoundEnabled, setSoundVolume, playUISound, setMusicEnabled, setMusicVolume, setAudioScene, audioSceneFor, unlockAudio } from './audio.js';
import { renderCharacterCreator, captureCreatorDraft, randomizeCreatorDraft, defaultCreatorDraft, creatorStepTitles, selectCreatorPortrait, selectCreatorHeritage, rollCreatorName, toggleCreatorTrait, adjustCreatorAttribute, selectCreatorOrigin, normalizeCreatorDraft, randomizeCreatorPortrait, toggleCreatorLock, creatorDependencyChanges } from './creator.js';
import { createSaveStore, createSaveCoordinator, keepable } from './saves.js';
import { openSaveStorage } from './save-storage.js';
import { createIronmanSession } from './ironman-session.js';
import { isIronman, createIronmanMetadata } from './ironman.js';
import { isIronmanStorageKey, IRONMAN_RECORD_PREFIX, IRONMAN_ENDED_PREFIX, validIronmanRunId } from './ironman-storage.js';
import { careerView } from './careers.js';
import { householdCostPreview, annualWorkRatio } from './budget.js';
import { commitmentPanel, societyPanel, compatibilityPanel, communityPanel, fellowshipPanel, sanctuaryPanel, schoolDepthPanel, adoptionPanel } from './expansion-ui.js';
import { socialPanel, pastimePanel, storiesPanel, recoveryPanel } from './life-ui.js';

const root = document.getElementById('app');
// Retain only the initial static opening shell, never a live life or save UI,
// when an already-downloaded standalone game makes another offline copy.
const bootMarkup = root.innerHTML;
const SAVE_KEY = 'hearth-and-oath:life:v1';
const names = { warrior: 'Warrior', mage: 'Mage', rogue: 'Rogue', poor: 'Humble household', tradesfolk: 'Tradesfolk household', noble: 'Noble household', village: 'Village', city: 'City' };
const skinColors = { fair: '#edc6a2', warm: '#c68f62', brown: '#946343', deep: '#573e32' };
const hairColors = { chestnut: '#624231', black: '#252b28', gold: '#bf914f', silver: '#c5c3b9', red: '#994b32' };
let schoolTransferReview=null, homePurchaseReview=null, pendingDeletion=null;
let importToken=null, saveConflictDismissed=false;
let firstDayGuideReopened=false, firstDayGuideSource=null, firstDayGuideCached=null;
const coordinateSave=createSaveCoordinator();
let inboxPage=0,selectedNotice=null, notificationToasts=[], notificationTimer, inboxReadPending=null;
let game = null, tab = 'life', actionFilter = 'all', modal = null, selectedTarget = null, selectedAllyTarget = null, selectedContact = null, selectedLocation = null, mapScale = 1, chartSheet = 'country', chartGrid = false, movement = null, gearFilter = 'all', craftFinish = 'plain', economyGoal = 'road', toastTimer, focusReturn = null, feedPosition = 0, feedCount = 0;
let uiRendering=false,uiActions=null;
function actionsForUI(state){if(uiRendering&&state===game)return uiActions??=voiceActions(state,getActions(state));return voiceActions(state,getActions(state));}
const disclosureStates = new Map(), conversationPositions = new Map(), workspacePositions=new Map();
let renderedWorkspaceKey=null, renderRevision=0, announcementRevision=0;
let renderedTab = null, renderedPerson = null, circlePosition = 0;
let creationSeed = randomSeed();
let creatorDraft = defaultCreatorDraft(creationSeed), creatorStep = 0;
let creatingLife = false, creationRun = 0;
let projectAbandonReview=null,importOpener=null,routineReviewState=null;
function fullscreenLabel(){return document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';}
let creatorBaseline='',creatorUndo=null,creatorNotice='',creatorError='',creatorDirty=false,creatorLeaveTo='title',creationCandidate=null,creationSlotToken=null;
let portraitGalleryState={page:0,presentation:'all',archetype:'all',showLocked:false};
const offlineDownload = createOfflineDownload({ isLocal:()=>globalThis.location.protocol==='file:', localCopy:localOfflineGame, save:saveOfflineGameBlob, onChange:refreshOfflineDownload });
let selectedHex=null, workspaceReturn=null, pendingImport=null, importFromBackup=false, importSlot=0, journalQuery='',importReadRun=0;
let journalCategory='all';
let journalPages={},personalNotesScope='current',journalScope=null,pendingPersonalNote=null;
const personalNoteDrafts=createPersonalNoteDrafts(),noteReturnPositions=new Map();
let herbalCareReview=null,professionReview=null;
let selectedRoom=null, selectedDungeonRoom=null, spatialClickTimer=null, peopleScope='family', peopleQuery='', peoplePage=0, questCategory='main';
let mazeMapSession=null;
let spatialMode='country', spatialPane='map', peoplePane='conversations', packPane='equipment', activitiesPane='daily';
let packGoal='none', workspaceSections={},nearbyPage=0,nearbyQuery='';
let inventoryQuery='',inventorySort='type',inventoryCategory='all',inventoryItem=null;
let inventoryFavoritesOnly=false,selectedGearPreset=null,gearPresetReview=null;
let questInvitations='preview',questArchiveQuery='';
let serviceSession=null,serviceTopic=null;
let craftSession=null;
let sceneReturn=null, sceneActionRevision=0, sceneFocus=null;
const sceneReturnReaders={services:settlementServices,people:nearbyContacts};
let shopSession=null,mapLife=null,renderedModal=null;
const mapCamera=installMapCamera(root,{zoom:zoomChart,home:()=>zoomChart('home'),cancelInspection:()=>clearTimeout(spatialClickTimer)});
let screen = 'title', slotsMode = 'load', overwriteSlot = null, entryNotice = '';
// Saves live in IndexedDB (no localStorage quota) behind a synchronous facade;
// localStorage remains the fallback. The module waits for it to load before
// anything reads a save. The boot guard in index.html waits for the same.
const storage = await openSaveStorage();
if(storage?.onChange)storage.onChange(event=>window.dispatchEvent(new StorageEvent('storage',{key:event.key,oldValue:event.oldValue,newValue:event.newValue})));
let displaySettings=readDisplay(storage);applyDisplay(displaySettings);
// One rulebook (v0.72): rulebook.js admits the new rules only. One policy feeds
// ordinary entry, incoming writes and Ironman locked entry.
const positionAdmissionPolicy = admissionPolicy();
// An old-rules life is kept as it was stored and never decoded here (rulebook.js).
const readStoredLife = storedLifeDecoder(migrateSave);
const saveStore = createSaveStore(storage, readStoredLife, {acceptPosition:positionAdmissionPolicy});
const lifeEntry = createLifeEntry({store:saveStore,coordinate:operation=>saveOperation(operation),acceptPosition:positionAdmissionPolicy});
/** A life this page keeps and can export but will not let into play: an old-rules life arriving by file or kept as a backup. */
const refusedHere = state => Boolean(state) && !lifeEntry.canEnter(state);
/** Who is in a slot: the life this build can open, or one it keeps exactly as stored because it cannot decode it. */
const occupantOf = id => saveStore.read(Number(id)) || saveStore.kept(Number(id));
/** A previous life kept undecoded in a slot's backup because it lives by the old rules: it can meet its door and be exported. */
const keptOldBackup = id => { const kept = saveStore.keptBackup(id); return kept && oldRules(kept) ? kept : null; };
const KEPT_UNREADABLE = 'This life could not be read here. It is kept exactly as it was written; export it to hold your own copy.';
const KEPT_RUN_DOOR = 'This Ironman run lives by the old rules. It is kept here as it was written and never opened; export it and open it in the archive.';
let activeSlot = saveStore.active();
let saved = saveStore.read(activeSlot);
let storageAvailable = saveStore.available();
let appViewEpoch=0, lifeSwitchEpoch=0, adoptingIronman=false, ironmanStatus=null, ironmanEnded=null, ironmanReview=null, ironmanRecoveries=null;
let cancelInventoryDrag=()=>{}, practiceProtectionScope=null, ironmanReviewSequence=0, ironmanEntryPending=false;
const ironmanSession=createIronmanSession({
 store:saveStore,readContext:()=>({state:game,slot:activeSlot}),
 acceptPosition:positionAdmissionPolicy,
 onAdopt(state,authority){
  if(!admitLifeEntry(state))return;
  cancelInventoryDrag();adoptingIronman=true;
  try{if(!['live'].includes(authority.kind)){modal=null;tab='life';pendingImport=null;importToken=null;}activeSlot=authority.slot;saved=structuredClone(state);ironmanReview=null;ironmanRecoveries=null;ironmanEnded=null;adoptPosition(state,authority.message,{persist:false});}
  finally{adoptingIronman=false;}
 },
 onEnd:info=>clearIronmanCopies(info.runId,{ended:info}),
 onDetach:info=>clearIronmanCopies(info.runId,{detached:info}),
 onStatus(status){
  ironmanStatus=status;
  if(status.phase==='blocked'||status.phase==='ended'||status.phase==='dormant')inboxReadPending=null;
  if(status.phase!=='ready')cancelInventoryDrag();
  clearTimeout(spatialClickTimer);
  // Adoption owns its render and accepted focus work. A ready announcement
  // must not replace that DOM. Protect must keep the requesting control alive.
  if(status.kind==='protect')return;
  if(status.phase==='ready'||status.phase==='dormant'){if(root.querySelector('[data-ironman-status][data-phase="pending"], [data-ironman-status][data-phase="blocked"]'))queueMicrotask(()=>{if(ironmanStatus===status&&!adoptingIronman)render();});return;}
  queueMicrotask(()=>{if(ironmanStatus===status&&!adoptingIronman)render();});
 }
});
const practiceController = createTacticsPracticeController({ readContext: practiceContext, coordinate: coordinatePractice, checkProtection: practiceProtection });
function runIdOf(state){return isIronman(state)?state.ironman?.runId:null;}
function viewOwner(){return {state:game,slot:activeSlot,screen,epoch:appViewEpoch,runId:runIdOf(game),sessionEpoch:ironmanSession.status().epoch,lifeEpoch:lifeSwitchEpoch};}
function ownsView(owner){return owner.state===game&&owner.slot===activeSlot&&owner.screen===screen&&owner.epoch===appViewEpoch&&owner.runId===runIdOf(game)&&owner.sessionEpoch===ironmanSession.status().epoch;}
function ownsSaveSource(owner){return owner.state===game&&owner.slot===activeSlot&&owner.runId===runIdOf(game)&&owner.sessionEpoch===ironmanSession.status().epoch&&owner.lifeEpoch===lifeSwitchEpoch;}
function ironmanFenced(){return ironmanEntryPending||Boolean(ironmanStatus&&(ironmanStatus.busy||ironmanStatus.unresolved||ironmanStatus.phase==='blocked'||ironmanStatus.phase==='ended'))||Boolean(isIronman(game)&&!ironmanSession.canMutate());}
function keepsInboxVisible(){return Boolean(inboxReadPending&&inboxReadPending.state===game&&inboxReadPending.runId===runIdOf(game)&&modal==='inbox'&&ironmanStatus?.phase==='pending'&&ironmanStatus.kind==='live');}
function ironmanSavePending(){return !adoptingIronman&&Boolean(ironmanEntryPending||ironmanStatus?.phase==='pending');}
function leaveIronman(){if(ironmanEntryPending||!ironmanSession.releaseStandard())return false;cancelInventoryDrag();appViewEpoch++;lifeSwitchEpoch++;ironmanReviewSequence++;ironmanReview=null;ironmanRecoveries=null;ironmanEnded=null;return true;}
function clearIronmanCopies(runId,{ended=null,detached=null}={}){
 const matches=value=>runIdOf(value)===runId;
 const active=matches(game),relevant=active||!game&&ironmanStatus?.runId===runId;
 if(matches(sceneReturn?.game)){sceneReturn=null;sceneFocus=null;}
 if(matches(saved))saved=null;
 if(matches(pendingImport)){pendingImport=null;importToken=null;if(modal==='import-review')modal=null;}
 if(matches(practiceController.current()?.origin?.life))practiceController.discard();
 if(matches(firstDayGuideSource)){firstDayGuideSource=null;firstDayGuideCached=null;firstDayGuideReopened=false;}
 if(ironmanReview?.runId===runId)ironmanReview=null;
 if(ironmanRecoveries)ironmanRecoveries=ironmanRecoveries.filter(row=>row.runId!==runId);
 if(active){game=null;sceneReturn=null;sceneFocus=null;pendingPersonalNote=null;journalScope=null;homePurchaseReview=null;schoolTransferReview=null;gearPresetReview=null;selectedGearPreset=null;shopSession=null;craftSession=null;serviceSession=null;mazeMapSession=null;notificationToasts=[];selectedNotice=null;inboxReadPending=null;clearTimeout(notificationTimer);modal=null;cancelInventoryDrag();appViewEpoch++;lifeSwitchEpoch++;}
 if(relevant){screen='title';if(ended)ironmanEnded={runId,marker:ended.marker,cleanupPending:ended.cleanupPending};else if(detached){entryNotice=detached.deleted?'The Ironman position was deleted. Its casualty record is retained.':'The Ironman position was archived. Review it before reattaching.';screen='slots';slotsMode='load';}}
 if(relevant&&!adoptingIronman)queueMicrotask(()=>render());
}
async function coordinatePractice(operation){
 if(!isIronman(game))return ironmanFenced()?{status:'blocked',reason:'Resolve the Ironman save before opening practice.'}:coordinateSave(operation);
 const source=game;
 const result=await ironmanSession.protect(()=>{practiceProtectionScope=source;try{return operation();}finally{practiceProtectionScope=null;}});
 return result.status==='ready'?result.value:{status:'blocked',reason:'The current Ironman position could not be confirmed for practice.'};
}
function dispatchSlotLoad(value){if(value?.ironmanLoad){const {runId,slot}=value.ironmanLoad;ironmanSession.resume(runId,slot);}return value;}
function ironmanStatusMarkup(){
 const status=ironmanStatus||{},ended=ironmanEnded||status.phase==='ended',busy=status.busy||status.phase==='pending'||ironmanEntryPending;
 const phase=ended?'ended':busy?'pending':'blocked';
 const reason=status.reason?title(status.reason):'The browser has not yet confirmed authority for this position.';
 const review=ironmanReview;
 const reviewMarkup=status.unresolved&&status.kind==='reattach'&&review?.kind!=='lifecycle'?`<section class="panel"><h2>Review reattachment</h2><p>The attachment may already be saved. Retry the original operation or freshly review this run before choosing an archive or deletion.</p>${button('Review current run','ironman-review',status.runId,'secondary',busy)}</section>`:review?.kind==='lifecycle'?`<section class="panel"><h2>Review the current lifecycle choice</h2><p>An archive or deletion may already be saved. Retry it or freshly review the same run before choosing another lifecycle action.</p>${button('Review current run','ironman-review',review.runId,'secondary',busy)}${button('Archive reviewed position','ironman-archive','','secondary',busy)}${button('Delete reviewed position','ironman-delete','','danger',busy)}</section>`:review?`<section class="panel"><h2>Review this saved position</h2><p>${e(review.name||'Ironman life')} · ${review.age!=null?'Age '+review.age+' · ':''}Day ${e(review.day??'unknown')} · Slot ${review.slot+1}</p><p>${review.kind==='authority'?'Use this already saved position after a fresh same-run check. The previous action will not be replayed.':'Reattach the retained position to this reviewed empty slot. An unresolved action can resume only if the saved position exactly matches its reserved candidate.'}</p>${button(review.kind==='authority'?'Use newer saved position':'Reattach reviewed position',review.kind==='authority'?'ironman-use-authority':'ironman-reattach','','primary',busy)}</section>`:'';
 return `<main class="menu-screen"><section class="menu-panel" data-ironman-status data-phase="${phase}" aria-busy="${busy}" aria-labelledby="ironman-status-heading"><span class="eyebrow">IRONMAN</span><h1 id="ironman-status-heading" tabindex="-1">${ended?'This run has ended':'Your saved life needs attention'}</h1><p>${ended?(ironmanEnded?.cleanupPending||status.cleanupPending?'Combat death is confirmed. Full-position cleanup is still pending; this run cannot resume.':'Combat death is confirmed. The managed playable position has been removed.') :busy?'Keep this page open while the saved-life check finishes.':'Play and export are paused. The operation may already be saved; no earlier position has been restored.'}</p>${!busy&&!ended?`<p role="status">${e(reason)}</p>`:''}<div class="modal-buttons">${!busy&&status.runId&&(!ended||ironmanEnded?.cleanupPending||status.cleanupPending)?button(ended?'Retry cleanup':status.unresolved?'Retry the reserved operation':'Retry authority check','ironman-retry','','primary'):''}${!busy&&!ended&&status.runId?button('Check saved authority','ironman-refresh','','secondary'):''}${!busy&&status.unresolved&&!ended?button('Review newer saved position','ironman-review-authority','','secondary')+(['live','create','import'].includes(status.kind)?button('Review recovery attachment','ironman-review-recovery','','secondary'):''):''}${!busy&&!status.unresolved?button('Return to main menu','ironman-standard-return','','ghost'):''}</div>${reviewMarkup}</section></main><div id="toast" class="toast" role="status" hidden></div>`;
}
async function reviewIronmanAuthority(kind){
 const status=ironmanSession.status(),runId=status.runId,slot=status.slot;
 if(!runId||status.busy)return;
 const sequence=++ironmanReviewSequence,owner=viewOwner();let summary=null;
 const result=await saveStore.inspectIronman(runId,{intent:'resume',slot,consume:(state,authority)=>{summary={runId,slot:authority.slot,token:authority.token,name:state.hero.name,age:state.age,day:state.day,kind};}});
 if(sequence!==ironmanReviewSequence||!ownsView(owner))return;
 if(result.status==='ended'){await fanoutIronmanMarkers([runId]);return;}
 if(result.status==='ready'&&summary){ironmanReview=summary;render();}else toast('The saved position cannot be reviewed: '+title(result.reason||result.status)+'.');
}
async function reviewIronmanRecovery(runId=ironmanSession.status().runId){
 const sequence=++ironmanReviewSequence,owner=viewOwner();
 const heads=await saveStore.listRecoverableIronman(),head=heads.runs?.find(row=>row.runId===runId);
 if(!head){toast('No retained position is available for this run.');return;}
 for(let slot=0;slot<3;slot++){
  const result=await saveStore.inspectIronman(runId,{intent:'reattach',slot});
  if(sequence!==ironmanReviewSequence||!ownsView(owner))return;
  if(result.status==='review'){const fresh=await saveStore.listRecoverableIronman(),row=fresh.runs?.find(row=>row.runId===runId);if(sequence!==ironmanReviewSequence||!ownsView(owner))return;if(!row||row.token!==head.token){toast('The retained position changed. Review it again.');return;}ironmanReview={...row,kind:'recovery',runId,slot,token:result.token};render();return;}
  if(result.status==='ended'){await fanoutIronmanMarkers([runId]);return;}
 }
 toast('No freshly reviewed empty slot is available for this retained position. Existing lives were preserved.');
}
async function fanoutIronmanMarkers(runIds){
 for(const runId of new Set(runIds.filter(Boolean))){
  const result=await saveStore.endIronman(null,runId,{});
  if(['ended','ended-cleanup-pending'].includes(result.status))clearIronmanCopies(runId,{ended:{...result,cleanupPending:result.status!=='ended'}});
 }
}
async function inspectIronmanImport(){
 const incoming=pendingImport,slot=importSlot,sequence=++ironmanReviewSequence,owner=viewOwner();importToken=null;
 const result=await saveStore.inspectIronman(incoming,{intent:'import',slot});
 if(sequence!==ironmanReviewSequence||pendingImport!==incoming||slot!==importSlot||!ownsView(owner))return;
 if(result.status==='review'){importToken=result.token;render();}
 else if(result.status==='known-head'){importToken=null;entryNotice='This file identifies an existing Ironman run. Resume its current saved position or review its retained archive; the file cannot overwrite it.';render();}
 else if(result.status==='ended'){await fanoutIronmanMarkers([runIdOf(incoming)]);render();}
 else{entryNotice='Ironman import is paused: '+title(result.reason||result.status)+'.';render();}
}


function ironmanReviewDialog(){
 const review=ironmanReview;if(!review)return '<p>Review this position again.</p>';
 const recovery=review.kind==='recovery';
 if(review.kept)return keptRunDialog(review);
 return `<span class="eyebrow">IRONMAN POSITION</span><h2>${e(review.name||'Review retained position')}</h2><p>${review.age!=null?'Age '+review.age+' · Day '+review.day:'Only the latest retained position can reattach.'}</p>${recovery?`<p>Reattach to freshly reviewed empty slot ${review.slot+1}. Existing backups and other lives remain intact.</p>${button('Reattach reviewed position','ironman-reattach','','primary')}`:`<p>Archive keeps the full position for later reviewed reattachment. Delete position removes that full position and keeps its nonplayable casualty record; importing a downloaded copy will not restore the deleted position.</p><div class="modal-buttons">${button('Archive position','ironman-archive','','secondary')}${button('Delete position','ironman-delete','','danger')}${review.attached?'':button('Review empty slot for reattachment','ironman-review-recovery',review.runId,'primary')}</div>`}`;
}
/** A kept Ironman run: export it for the archive, release its slot (it stays here, whole, among the retained positions), or delete it. It never opens here. */
function keptRunDialog(review){
 const door=review.oldRules?KEPT_RUN_DOOR:KEPT_UNREADABLE;
 return `<span class="eyebrow">${review.oldRules?'KEPT FOR THE ARCHIVE':'KEPT AS IT WAS WRITTEN'}</span><h2>${e(review.name||'A kept Ironman run')}</h2><p>${review.age!=null?'Age '+review.age+(review.day!=null?' · Day '+review.day:''):''} · Ironman</p><p data-archive-door>${e(door)}</p><p>${review.attached?'Releasing the slot keeps the run here, whole, among the retained Ironman positions, and frees the slot for a new life. ':''}Deleting removes it from this browser; export it first.</p><div class="modal-buttons">${button(review.oldRules?'Export for the archive':'Export this run','ironman-export-kept',review.runId,'primary')}${review.attached?button('Release the slot','ironman-archive','','secondary'):''}${button('Delete the run','ironman-delete','','danger')}${review.oldRules?archiveLink('ghost'):''}</div>`;
}
async function reviewIronmanLifecycle(runId){
 const sequence=++ironmanReviewSequence,owner=viewOwner();let review=null;
 const attached=saveStore.list().find(row=>runIdOf(row.state)===runId),held=attached?null:saveStore.list().find(row=>runIdOf(row.kept)===runId);
 if(attached){
  const result=await saveStore.inspectIronman(runId,{intent:'resume',slot:attached.id,consume:(state,authority)=>{review={kind:'lifecycle',runId,slot:authority.slot,token:authority.token,name:state.hero.name,age:state.age,day:state.day,attached:true};}});
  if(result.status==='ended'){await fanoutIronmanMarkers([runId]);return;}
 }else if(held){
  // A kept run is read only through its export inspection: it is never resumed to be reviewed.
  const result=await saveStore.inspectIronman(runId,{intent:'export',slot:held.id,consume:(state,authority)=>{review={kind:'lifecycle',runId,slot:authority.slot,token:authority.token,name:state.hero.name,age:keptAge(state),day:state.day,attached:true,kept:true,oldRules:oldRules(state)};}});
  if(result.status==='ended'){await fanoutIronmanMarkers([runId]);return;}
 }else{
  const result=await saveStore.listRecoverableIronman();
  const row=result.runs?.find(row=>row.runId===runId);if(row)review={...row,kind:'lifecycle',attached:false,slot:0};
  if(row?.kept){const read=await saveStore.inspectIronman(runId,{intent:'export',slot:null,token:row.token,consume:state=>{review={...review,oldRules:oldRules(state)};}});if(read.status!=='ready')review=null;}
 }
 if(sequence!==ironmanReviewSequence||!ownsView(owner))return;
 if(!review){toast('This position changed or could not be reviewed. Nothing was changed.');return;}
 ironmanReview=review;if(!ironmanFenced())modal='ironman-review';render();
}
async function handleIronmanControl(op,id){
 const status=ironmanSession.status();
 if(op==='ironman-retry'){if(!status.busy)await ironmanSession.retry();return;}
 if(op==='ironman-refresh'){if(!status.busy)await ironmanSession.refresh();return;}
 if(op==='ironman-standard-return'){if(!status.busy&&!status.unresolved&&leaveIronman()){game=null;modal=null;screen='title';saved=saveStore.read(activeSlot);render();}return;}
 if(op==='ironman-review-authority'){await reviewIronmanAuthority('authority');return;}
 if(op==='ironman-review-recovery'){await reviewIronmanRecovery(id||status.runId);if(!status.unresolved&&!ironmanFenced()&&ironmanReview){modal='ironman-review';render();}return;}
 if(op==='ironman-review'&&status.unresolved&&['archive','delete','reattach'].includes(status.kind)&&!status.busy&&id===status.runId){await reviewIronmanLifecycle(id);return;}
 if(op==='ironman-use-authority'){const review=ironmanReview;if(review?.kind==='authority'&&!status.busy)ironmanSession.chooseAuthority(review.runId,review.slot,{reviewed:true,token:review.token});return;}
 if(op==='ironman-reattach'){const review=ironmanReview;if(review?.kind!=='recovery'||status.busy)return;const options={reviewed:true,token:review.token};if(status.unresolved&&['live','create','import'].includes(status.kind))ironmanSession.recoverCandidate(review.runId,review.slot,options);else ironmanSession.reattach(review.runId,review.slot,options);return;}
 if(op==='ironman-export-kept'){const review=ironmanReview;if(review?.kept&&review.runId===id&&!status.busy)await exportKeptIronman(review.runId,review.attached?review.slot:null);return;}
 if(op==='ironman-archive'||op==='ironman-delete'){const review=ironmanReview;if(review?.kind!=='lifecycle'||status.busy)return;ironmanSession[op==='ironman-archive'?'archive':'delete'](review.runId,{reviewed:true,token:review.token});return;}
 if(ironmanFenced())return;
 if(op==='ironman-review'){await reviewIronmanLifecycle(id);return;}
 if(op==='ironman-known-resume'){const row=saveStore.list().find(row=>runIdOf(row.state)===id);if(row)ironmanSession.resume(id,row.id);else await reviewIronmanRecovery(id);return;}
 if(op==='ironman-recoveries'){
  const opener=root.querySelector('[data-op="ironman-recoveries"]');
  const owner=viewOwner(),sequence=++ironmanReviewSequence,result=await saveStore.listRecoverableIronman();
  if(!ownsView(owner)||sequence!==ironmanReviewSequence)return;
  if(result.status==='ready'){ironmanRecoveries=result.runs;openModal('ironman-recoveries',opener);}else toast('Retained positions could not be reviewed: '+title(result.reason||result.status)+'.');
 }
}

function uiHelpers(){return {e,title,button,paragraphs,meter,actionCards,chapter,date,historyList,materialNeeds,livingCosts,section:workspaceSection(tab,workspaceSections[tab]),nearbyPage,nearbyQuery,selectedDungeonRoom,shopSession,craftSession,serviceSession,serviceTopic,mapScale,chartSheet,chartGrid,encounter:()=>eventScene()};}
const firstDayGuideReaders={actions:getActions,unlocks:getAgeUnlocks,services:settlementServices,walkPath:settlementWalkPath,offers:serviceMeetingOffers,commitment:getLifeCommitment,ageControl:ageControlState};
function firstDayGuideMarkup(){
 if(farmerDayVisible(game))return '';
 if(!firstDayGuideVisible(game,firstDayGuideReopened))return '';
 if(firstDayGuideSource!==game){firstDayGuideSource=game;firstDayGuideCached=firstDayGuideView(game,firstDayGuideReaders);}
 return renderFirstDayGuide(game,firstDayGuideCached,{...uiHelpers(),actionCostSummary,actionCostDetails});
}
function workspaceSettings(){return {tab,selectedLocation,selectedHex,mapScale,chartSheet,chartGrid,workspaceReturn,spatialMode,spatialPane,selectedContact,peoplePane,packPane,packGoal,gearFilter,activitiesPane,workspaceSections,inventoryQuery,inventorySort,inventoryCategory,inventoryItem,inventoryFavoritesOnly};}
function rememberWorkspace(){if(game&&!practiceController.current())saveWorkspace(game,workspaceSettings(),storage);}
function resetGearOrganizerView(){inventoryFavoritesOnly=false;selectedGearPreset=null;gearPresetReview=null;}
function revealGearOrganizer(){const detail=root.querySelector('.gear-loadouts');if(detail)detail.open=true;disclosureStates.set('inventory:gear-loadouts',true);}
function gearOrganizerLifeKey(){return JSON.stringify([activeSlot,game?.seed,game?.dynasty?.generation,game?.dynasty?.activePersonId,game?.timeline?.birthDay]);}
function commitGearOrganizer(command,message,afterAdopt) {
  const result=gearOrganizerCommand(game,command);
  if(!result.ok){toast([result.reason,...(result.issues||[]).map(issue=>issue.name+': '+issue.reason)].join(' '));return false;}
  if(!result.changed){toast(command.kind==='apply'?'This complete loadout is already equipped.':'That saved arrangement is already current.');afterAdopt?.();return true;}
  return update(result.state,message,{afterAdopt});
}
function viewTabs(rows,op,active,cls='record-tabs'){return `<nav class="${cls}" aria-label="Screen sections">${rows.map(([id,label])=>`<button class="button ${active===id?'active':'ghost'}" type="button" data-op="${e(op)}" data-id="${e(id)}" aria-pressed="${active===id}">${e(label)}</button>`).join('')}</nav>`;}
function currentJournal(){return (game?.journal||[]).filter(j=>(j.generation||1)===(game?.dynasty?.generation||1));}
function careerViewPage(){if(game.age<16)return householdPage('learning');const ui=uiHelpers();if(ui.section==='adventuring')return adventurePage(game,actionsForUI(game),{...ui,section:'board'})+depthPanel(game,ui,'adventure');return ui.section==='community'?communityPanel(game,ui):ui.section==='neighbors'?societyPanel(game,ui)+socialPanel(game,ui)+`<section class="panel"><h2>Make good on an earlier promise</h2><p>Restoration work keeps its actual place, attendance and fee. The person decides afterward whether it answers their concern.</p>${actionCards(actionsForUI(game).filter(a=>a.id.startsWith('conversations_')))}</section>`:careerPage(game,ui,{goal:economyGoal})+(ui.section==='livelihood'?`<section class="panel employment-education"><h2>Continue Your Education</h2><p>Lessons and examinations remain available alongside your working life.</p>${button('School & Learning Records','workspace-open','household:learning','secondary small')}</section><section class="panel"><h2>Adventuring Work</h2><p>Manage local contracts, recovered proof and expeditions alongside your trade.</p>${button('Manage Adventuring','workspace-section','career:adventuring','secondary')}</section>`:'');}
function healthViewPage(){const ui=uiHelpers();return ui.section==='recovery'?(recoveryPanel(game,ui)||'<section class="panel"><h2>No recovery plan is available</h2><p>Resolve the present decision before setting aside dedicated care time.</p></section>'):ui.section==='sanctuary'?(sanctuaryPanel(game,ui,'conditions')||'<section class="panel"><h2>No supernatural arrangement is active</h2><p>Named donor agreements and moon refuges appear here when your actual condition calls for them.</p></section>'):healthPage(game,ui);}
function legacyViewPage(){
 const rows=game.lineage?.people||[],actions=actionsForUI(game).filter(a=>a.id.startsWith('lineage_continue_'));
 return chapter('Family history','The people who came before, and the records carried forward.','YOUR HOUSEHOLD')+`<section class="panel"><h2>Your Family</h2>${rows.slice(-60).reverse().map(p=>`<article class="remembered-entry"><h3>${e(p.name)}</h3><p>${e(roleTitle(p.role||p.relation||p.source||'Family'))} · ${p.alive===false?'Remembered':'Living'}</p></article>`).join('')||'<p>Your family history begins with you.</p>'}${actions.length?actionCards(actions):''}<p class="small-copy">Visit your family at home. Speak with the Shrine Keeper to ask about welcoming a child.</p>${button('Living family','home-family','','secondary small')}${button('Your Surroundings','place-open','','secondary')}</section>`;
}

function householdPage(forcedSection=null){const ui={...uiHelpers(),...(forcedSection?{section:forcedSection}:{})},school=game.education;if(ui.section!=='learning')return householdBasePage(ui);return `${game.age>=3&&game.age<6?`<section class="panel school-term-guide"><span class="eyebrow">LEARNING BEFORE SCHOOL</span><h2>Stories, pictures &amp; counting</h2><p>Share two sessions with a willing adult nearby to support a year of curiosity. Formal school begins at six; these sessions award no attendance or qualification.</p>${offeredButton('grow_nursery')}</section>`:''}`+(school&&game.age>=6?`<section class="panel school-term-guide"><span class="eyebrow">THIS SCHOOL YEAR</span><h2>${e(!school.enrolled?'Choose a place to learn':'Your next learning step')}</h2><p>${e(!school.enrolled?'Enroll in a learning route below.':school.qualifications?.some(q=>q.route===school.route)?'Qualification earned. Explore an academic project, mentorship or another route.':school.progress<4?`Attend ${4-school.progress} more lessons to attempt the exam; six total progress guarantees a prepared pass.`:school.progress<6?'An exam attempt is available. Two more progress prepares a guaranteed pass.':'Your preparation is ready. Present your term examination.')}</p><div class="education-progress"><span>${school.lessonsThisYear||0}/8 supervised lessons this year</span><span>${school.progress||0} course progress</span></div></section>${householdBasePage(ui)}${schoolDepthPanel(game,ui)}<details class="panel school-records" data-disclosure="school-records"><summary>School Records</summary>${historyList(school.history)||'<p>Your enrollment, lessons and examinations will be recorded here.</p>'}</details>`:householdBasePage(ui)+schoolDepthPanel(game,ui));}
function characterView(){return characterBaseView();}
function partyView(){return partyBaseView()+preparationPanel()+(game.battlecraft&&battlecraftPanel(game,e,{sections:['companions','record']})?`<section class="panel">${battlecraftPanel(game,e,{sections:['companions','record']})}</section>`:'');}
function relationshipsView(){const options={scope:peopleScope,query:peopleQuery,page:peoplePage,selectedId:selectedContact},v=peopleRecordPage(game,options);peoplePage=v.page;selectedContact=v.selected?.id||null;const ui=uiHelpers(),family=peopleScope==='family',tasks=actionsForUI(game).filter(a=>a.id.startsWith('family_')||a.id.startsWith('lineage_')&&!a.id.startsWith('lineage_adoption_')||a.id==='life_family');return renderPeopleRecords(game,ui,{...options,page:peoplePage,selectedId:selectedContact,view:v})+(family?`${tasks.length?`<details class="home-disclosure family-responsibilities" data-disclosure="family-responsibilities"><summary>Family visits &amp; responsibilities</summary><p class="small-copy">Parents and other relatives keep their own homes. Visit their recorded settlement and Homes area to spend time together.</p>${actionCards(tasks)}</details>`:''}${game.age>=18?`<details class="home-disclosure family-adoption" data-disclosure="family-adoption"><summary>Welcoming a child</summary><p class="small-copy">Speak with a Shrine Keeper in their settlement to begin. Existing preparations and family records remain here.</p>${adoptionPanel(game,ui)}</details>`:''}${renderIndependentLives(game,ui)}${button('Family history','tab','legacy','ghost small')}`:'');}
function questsView(){return supplyGuidePanel()+renderQuestJournal(game,actionsForUI(game),uiHelpers(),{category:questCategory,invitations:questInvitations,archiveQuery:questArchiveQuery})+(questCategory==='side'?depthPanel(game,uiHelpers(),'stories'):'');}
function zoomChart(id,anchor){
  if(!['in','out','reset','home'].includes(id))return;
  if(id==='home'&&!root.querySelector('.journey-world-map')&&chartSheet!=='country'&&chartSheet!=='local'){chartSheet='local';mapCamera.forget();render();}
  if(id==='reset'||id==='home'){
    if(id==='reset')mapScale=1;else if(!root.querySelector('.journey-world-map'))mapScale=Math.max(1.75,mapScale);
    root.querySelectorAll('.hex-board:not(.compact)').forEach(el=>el.style.setProperty('--map-scale',mapScale));
    centerWorldMap(root);mapCamera.capture();
  }else mapCamera.zoomAround(()=>{mapScale=Math.max(1,Math.min(4,mapScale+(id==='in'?.25:-.25)));root.querySelectorAll('.hex-board:not(.compact)').forEach(el=>el.style.setProperty('--map-scale',mapScale));},anchor);
  for(const el of root.querySelectorAll('[data-map-zoom-label]'))el.textContent=Math.round(mapScale*100)+'%';
  rememberWorkspace();
}
function mapView(){if(modal==='map')return '<h1>Explore</h1><p>The chart is open.</p>';return renderExplorationWorkspace(game,{selectedKey:selectedHex,selectedPlace:selectedLocation},uiHelpers());}
function currentDungeonView(){if(game.delve)return renderDelve(game,uiHelpers());if(game.maze){mazeMapSession=currentMazeMapSession(game,mazeMapSession);return renderMaze(game,uiHelpers(),mazeMapSession);}return renderDungeonCrawler(game,uiHelpers(),{encounter:game.event?eventScene():actionsForUI(game).some(a=>a.id.startsWith('rpg_room_')||a.id.startsWith('rpg_boss_'))?'':actionCards(actionsForUI(game).filter(a=>a.id.startsWith('explore_')&&!a.id.startsWith('explore_route_')||['adventure_continue','adventure_withdraw'].includes(a.id))),selectedId:selectedDungeonRoom});}
function placeView(){if(game.battle)return battleView();if(game.delve||game.maze||game.dungeon||game.rpg?.expedition||game.adventuring?.expedition)return currentDungeonView();if(game.justice?.prison)return realmPage(game,actionsForUI(game),{...uiHelpers(),section:'law'});craftSession=currentCraftSession(game,craftSession);if(craftSession?.mode==='craft')craftSession.quote=craftQuote(game,actionsForUI(game),craftSession);shopSession=currentShopSession(game,shopSession);if(shopSession?.mode==='trade')shopSession.quote=quoteTrade(game,shopSession.draft);return renderSettlementList(game,{selectedContact},uiHelpers());}
function ongoingActivityPanel(){
 const c=getLifeCommitment(game),batch=game.careers?.batch,project=game.workshop?.project;
 if(!c&&!batch&&!project)return '';
 if(c?.kind==='tournament')return renderTournamentCard(game,uiHelpers(),actionsForUI(game),{potionReason:consumableReason(game,'potions')});
 const name=c?.kind==='recovery'?'Rest & Recovery':c?.kind==='stories'?'Helping Someone':c?.kind==='conversations'?'Keeping a Promise':batch?'Your Work':project?'Making Something':c.title;
 const remaining=c?.remainingDays??batch?.remainingDays??project?.remainingDays??0;
 const actions=actionsForUI(game).filter(a=>c?.kind==='justice_job'?/^justice_job_(continue|withdraw)$/.test(a.id):/_(continue|cancel|abandon|resume)$/.test(a.id));
 return `<section class="panel ongoing-activity"><span class="eyebrow">IN PROGRESS</span><h2>${e(name)}</h2><p>${remaining?remaining+' days remain.':'You can continue when you are ready.'}</p>${actionCards(actions)}</section>`;
}
function careerPlanPanel(){return game.careers?.batch?ongoingActivityPanel():'';}
function savedYearPanel(){return game.life?.plan?`<section class="panel saved-year"><h2>Your saved year</h2><p>${Math.max(0,game.life.plan.targetDay-game.day)} days remain in this earlier plan.</p>${button('Continue the saved year','continue-year','','secondary',!!game.event||!!game.battle||!!game.conversations?.pending||!!game.dungeon||!!game.timeline?.journey||!!game.workshop?.project||!!game.careers?.batch)}</section>`:'';}

function e(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function title(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function admitLifeEntry(state){
  if(lifeEntry.canEnter(state))return true;
  // An explicit conflict discard may already have cleared the live position.
  // Never leave its former game screen pointing at a freshly rebased store.
  if(!game&&screen==='game'){screen='slots';slotsMode='load';modal=null;render();}
  toast('This life cannot be opened here. Its saved copy is still yours.');
  return false;
}

function saveOperation(operation, complete = value => value, {sameLife=false}={}) {
  const owner=viewOwner(),isCurrent=()=>sameLife?ownsSaveSource(owner):ownsView(owner);
  const failed=()=>{if(isCurrent()){storageAvailable=false;reflectStorageWarning();}return false;};
  try {
    const result=coordinateSave(()=>isCurrent()?operation():false);
    if(result?.then)return result.then(value=>isCurrent()?complete(value):false).catch(failed);
    return complete(result);
  } catch { return failed(); }
}
function activeSaveConflict(){const conflict=saveStore.conflict();return conflict?.id===activeSlot?conflict:null;}
function slotSaveHealth(id,live=false){const health=saveStore.health(id,live&&Number(id)===activeSlot&&game?game:undefined);return health.status==='pending'&&!storageAvailable?{...health,status:'unsaved'}:health;}
function saveHealthMarkup(id,{live=false,...options}={}){return renderSaveHealth(slotSaveHealth(id,live),{e,available:storageAvailable,live,...options});}
function reflectStorageWarning(){
  // Update copy and visibility in place: a completed queued save must not
  // replace focused controls or replay normal save timestamps as live alerts.
  for(const host of root.querySelectorAll('[data-save-health]')){
    const health=slotSaveHealth(Number(host.dataset.saveSlot),host.dataset.saveLive==='true'),view=saveHealthView(health,storageAvailable,{unknownTimeLabel:host.dataset.saveUnknownTime});
    host.dataset.saveState=health.status;host.dataset.saveAt=health.lastSavedAt||'';
    host.classList.toggle('save-health-warning',view.warning);
    for(const [selector,text] of [['[data-save-label]',view.label],['[data-save-time]',view.lastSaved],['[data-save-problem]',view.problem]]){
      const node=host.querySelector(selector);if(!node)continue;
      if(node.textContent!==text)node.textContent=text;
      if(selector==='[data-save-time]')node.hidden=!text;
      if(selector==='[data-save-problem]')node.className=text?'':'sr-only';
    }
    const escape=host.querySelector('[data-op="export-session"]');if(escape)escape.hidden=!view.exportable;
    const card=host.closest('[data-return-life-card]'),source=card?.querySelector('[data-slot-source]');
    if(source){const note=returnLifeSourceNote(health,card.dataset.slotLive==='true');if(source.textContent!==note)source.textContent=note;source.hidden=!note;}
  }
}
function reflectSaveStatus() {
  storageAvailable=saveStore.available();
  if(activeSaveConflict()&&!saveConflictDismissed){practiceController.discard();modal='save-conflict';render();}
  else reflectStorageWarning();
}
function save() {
  if(isIronman(game)){if(ironmanFenced())return false;return ironmanSession.refresh();}
  if(ironmanFenced()||practiceController.current())return false;
  if (!game || !validateSave(game)) return false;
  const position=game, slot=activeSlot, owner=viewOwner();
  saveStore.invalidateHealth(slot);
  saved = structuredClone(game);
  rememberWorkspace();
  return saveOperation(()=>saveStore.write(slot,position),success=>{
    if(ownsSaveSource(owner)&&game===position&&activeSlot===slot)reflectSaveStatus();
    return success;
  },{sameLife:true});
}
function refreshSavedLives(complete, { discardSession=false, shouldContinue=()=>true } = {}) {
  if(ironmanFenced())return false;
  return saveOperation(()=>{
    if(!shouldContinue())return false;
    // Earlier queued autosaves can fail or discover a conflict while a browser
    // lock is held elsewhere. Decide here, not when navigation was requested.
    const held=!discardSession&&(activeSaveConflict()||game&&saveStore.hasUnsaved());
    const success=held||saveStore.reload();
    storageAvailable=saveStore.available();
    if(!discardSession&&activeSaveConflict()){openModal('save-conflict');return false;}
    if(!success){entryNotice='The saved lives could not be read. Nothing has been replaced. Export your current life before closing this page.';render();toast(entryNotice);return false;}
    if(!shouldContinue())return false;
    saveConflictDismissed=false;
    // Adopt the reviewed position and navigate within this same synchronous
    // critical section. A dismissed queued reload cannot reset the session.
    return complete();
  },dispatchSlotLoad);
}

function update(next,message,{afterAdopt,afterPersist}={}) {
  if(practiceController.current()||ironmanFenced())return false;
  if(isIronman(game)||isIronman(next)){
    if(!isIronman(game)||!isIronman(next)||runIdOf(game)!==runIdOf(next))return false;
    const owner=viewOwner();
    return ironmanSession.accept(next,{message,afterAdopt:(accepted,authority)=>{
      if(game===accepted&&activeSlot===authority.slot&&appViewEpoch===owner.epoch&&screen===owner.screen&&runIdOf(game)===authority.runId&&ironmanSession.status().epoch===authority.epoch){adoptingIronman=true;try{afterAdopt?.(accepted);afterPersist?.(true,accepted);}finally{adoptingIronman=false;}}
    }});
  }
  return adoptPosition(next,message,{afterAdopt,afterPersist});
}
function adoptPosition(next,message,{persist=true,afterAdopt,afterPersist}={}) {
  if(practiceController.current())return false;
  // Reject a broken result before changing the live position, selections,
  // movement, or any slot. Storage failure is a separate concern:
  // a valid result may still be played and exported within this session.
  if(!validateSave(next)){
    playUISound('error');
    openModal('recovery',document.activeElement);
    return false;
  }
  if(!admitLifeEntry(next))return false;
  sceneReturn=null;sceneFocus=null;sceneActionRevision++;
  const focused=document.activeElement?.dataset?.op?{op:document.activeElement.dataset.op,id:document.activeElement.dataset.id}:null;
  if(pendingPersonalNote&&next!==game){pendingPersonalNote=null;if(modal==='personal-note')modal=null;}
  const previous=game;if(!previous||previous.seed!==next.seed||previous.dynasty?.generation!==next.dynasty?.generation){shopSession=null;craftSession=null;mazeMapSession=null;mapCamera.forget();} selectedRoom=null;selectedDungeonRoom=null; movement=previous?getMapMovement(previous,next):null; game=next; mazeMapSession=currentMazeMapSession(game,mazeMapSession);screen='game';
  if(!previous?.dungeon&&!previous?.maze&&!previous?.delve&&(game.dungeon||game.maze||game.delve)){spatialMode='dungeon';spatialPane='actions';}
  else if((previous?.dungeon||previous?.maze||previous?.delve)&&!game.dungeon&&!game.maze&&!game.delve)spatialMode='country';
  if(!previous?.battle||!next.battle){selectedTarget=null;selectedAllyTarget=null;}
  else {if(!next.battle.actors.some(a=>a.id===selectedTarget&&a.side==='enemy'&&a.hp>0))selectedTarget=null;if(!next.battle.actors.some(a=>a.id===selectedAllyTarget&&a.side==='party'&&a.hp>0))selectedAllyTarget=null;}
  if(previous&&previous.dynasty?.generation!==game.dynasty?.generation){workspaceSections={};nearbyPage=0;nearbyQuery='';peopleScope='family';peopleQuery='';peoplePage=0;questInvitations='preview';questArchiveQuery='';questCategory='main';selectedHex=null;workspaceReturn=null;spatialMode='country';spatialPane='map';peoplePane='conversations';packPane='equipment';packGoal='none';gearFilter='all';inventoryQuery='';inventorySort='type';inventoryCategory='all';inventoryItem=null;craftFinish='plain';economyGoal='road';tab='life';selectedContact=null;selectedLocation=null;feedPosition=0;feedCount=0;disclosureStates.clear();conversationPositions.clear();circlePosition=0;}
  if(previous&&previous.locationId!==game.locationId){serviceSession=null;nearbyPage=0;nearbyQuery='';selectedContact=null;shopSession=null;}
  if(previous&&JSON.stringify(previous.cartography?.interior)!==JSON.stringify(game.cartography?.interior)&&game.cartography?.interior)spatialPane='actions';
  const hasDescent=game.delve||game.maze||game.dungeon||game.rpg?.expedition||game.adventuring?.expedition;
  const changedMoment=!previous||JSON.stringify(previous.event)!==JSON.stringify(game.event)||Boolean(previous.battle)!==Boolean(game.battle)||previous.battle?.encounterId!==game.battle?.encounterId||previous.battle?.outcome!==game.battle?.outcome;
  const changedConversation=!previous||JSON.stringify(previous.conversations?.pending)!==JSON.stringify(game.conversations?.pending);
  const interrupted=game.event||game.battle||hasDescent||game.conversations?.pending;
  if((game.event||game.battle||hasDescent)&&tab==='map'&&previous)workspaceReturn='map';
  if(((game.event||game.battle)&&changedMoment)||(hasDescent&&(['life','place','map'].includes(tab)||!previous)))tab='life';
  else if(game.conversations?.pending&&changedConversation){tab=nearbyContacts(game).some(p=>p.id===game.conversations.pending.personId)?'place':'life';workspaceReturn=null;}
  else if(!interrupted&&previous&&(previous.event||previous.battle||previous.maze||previous.dungeon||previous.rpg?.expedition||previous.adventuring?.expedition)&&workspaceReturn==='map'){tab='map';workspaceReturn=null;}
  if(!previous&&!interrupted)workspaceReturn=null;
  const sameLife=previous&&previous.seed===game.seed&&(previous.timeline?.birthDay||0)===(game.timeline?.birthDay||0)&&(previous.dynasty?.generation||1)===(game.dynasty?.generation||1);
  if(!sameLife){firstDayGuideReopened=false;firstDayGuideSource=null;firstDayGuideCached=null;selectedGearPreset=null;gearPresetReview=null;if(previous)inventoryFavoritesOnly=false;serviceTopic=null;notificationToasts=[];selectedNotice=null;clearTimeout(notificationTimer);}
  const oldNotices=new Set(sameLife?notificationsFor(previous).map(n=>n.id):[]);
  const freshNotices=sameLife?notificationsFor(game).filter(n=>!oldNotices.has(n.id)):[];
  if(freshNotices.length){notificationToasts=freshNotices.sort((a,b)=>({health:0,gift:1,letter:2}[a.kind])-({health:0,gift:1,letter:2}[b.kind])).slice(0,3);clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>{notificationToasts=[];const stack=root.querySelector('.notification-toast-stack');if(stack)stack.innerHTML='';},9000);}
  const actionSound=previous?(freshNotices.length?'notification':transitionSound(previous,game)):null;
  if(previous)playUISound(actionSound);
  if(game.conversations?.pending){selectedContact=game.conversations.pending.personId;peoplePane='conversations';spatialPane='actions';}
  if(game.event||game.battle||game.conversations?.pending)workspaceSections.life='present';
  if(serviceSession&&!settlementServices(game).some(r=>r.id===serviceSession&&r.here))serviceSession=null;
  if(!serviceSession){serviceTopic=null;craftSession=null;}else craftSession=currentCraftSession(game,craftSession);
  const persistence=persist?save():true;if(!persist)rememberWorkspace();render();

  const newMoment=!previous||previous.event?.id!==game.event?.id||previous.event?.body!==game.event?.body||Boolean(previous.battle)!==Boolean(game.battle)||previous.battle?.outcome!==game.battle?.outcome||previous.conversations?.pending?.nodeId!==game.conversations?.pending?.nodeId;
  afterCurrentRender(()=>{
    if(modal)return;
    const control=!newMoment&&focused?[...root.querySelectorAll('[data-op]')].find(el=>el.dataset.op===focused.op&&el.dataset.id===focused.id&&!el.disabled&&el.getClientRects().length):null;
    (control||(newMoment?root.querySelector('.dialogue-speaker h2')||root.querySelector('.story-scene h2')||[...root.querySelectorAll('.game-content h1, .game-content h2')].find(el=>el.getClientRects().length):root.querySelector('#inventory-item-heading, .service-meeting h1, .workspace-body')))?.focus({preventScroll:true});
  });
  // Announce only the visible result already shown in Latest Result. A repeated
  // real action can have the same wording; an unchanged/stale result must not
  // replay it. Battle turns keep their own focused/log feedback.
  if(previous&&!modal&&!message&&game.notice&&(!game.battle||game.notice!==previous.notice)&&(game.notice!==previous.notice||actionSound!=='error'))announceView(conciseOutcome(game.notice));
  if(message)toast(message);
  afterAdopt?.(game);
  if(afterPersist)Promise.resolve(persistence).then(success=>afterPersist(success===true,next),()=>afterPersist(false,next));
  return true;
}

function transitionSound(before,next){
  const clean=v=>({...v,notice:'',battle:v.battle?{...v.battle,log:[]}:null});
  if(JSON.stringify(clean(before))===JSON.stringify(clean(next)))return 'error';
  if(before.battle?.outcome==='victory'&&!next.battle)return 'combat-success';
  if(next.age>before.age)return 'age';
  if(next.locationId!==before.locationId||next.cartography?.position!==before.cartography?.position)return 'travel';
  return 'choice';
}

function button(text, op, id = '', cls = 'secondary', disabled = false, pressed = null) { const aria=text==='◇'&&op==='tab'?'Open Inventory':text==='↓'&&op==='export'?'Export saved life':text==='↻'?'Choose a random world seed':null; return `<button class="button ${cls}" type="button" ${aria?`aria-label="${e(aria)}"`:''} ${pressed===null?'':`aria-pressed="${Boolean(pressed)}"`} data-op="${e(op)}" data-id="${e(id)}" ${disabled ? 'disabled' : ''}>${text}</button>`; }
function paragraphs(text) { return String(text || '').split(/\n+/).filter(Boolean).map(p => `<p>${e(p)}</p>`).join(''); }
function date(day = game?.day || 0) {
  const months = ['Snowfall', 'Thaw', 'Seedtime', 'Bloom', 'Suncrest', 'Highsummer', 'Harvest', 'Amber', 'Frost', 'Longnight', 'Starfall', 'Yearsend'];
  const d = ((day % 365) + 365) % 365, month = Math.min(11, Math.floor(d / 30));
  return `${d - month * 30 + 1} ${months[month]} · Year ${Math.floor(day / 365) + 1}`;
}
function location() { return game?.world.locations.find(l => l.id === game.locationId); }
function avatar(person,large=false) {
  return renderAvatar(person,{size:large?'large':'small',age:large?(game?.age??18):(person.age??18)});
}

function meter(value, max, label, cls = '') {
  return `<div class="stat-row"><span>${e(label)}</span><span>${e(value)} <span class="muted">/ ${e(max)}</span></span></div><div class="meter ${cls}" role="meter" aria-label="${e(label)}" aria-valuemin="0" aria-valuemax="${e(max)}" aria-valuenow="${e(value)}"><div class="meter-fill" style="width:${Math.max(0, Math.min(100, value / max * 100))}%"></div></div>`;
}
function uiIcon(id) {
  const paths={notifications:'M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3V9Zm4 12h4M12 1v2',life:'M8 19V8h8v11M7 19h10M12 8c-4-2-1-5 0-6 2 3 3 5 0 6',map:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7ZM9 9l6 6m0-6-6 6',relationships:'M4 20v-5c0-3 6-3 6 0v5m4 0v-5c0-3 6-3 6 0v5M10 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',activities:'m4 3 13 13m-4-1 3-3M20 3 7 16m4-1-3-3M3 20l4-4m10 0 4 4',menu:'M4 6h16M4 12h16M4 18h16',quests:'M5 22V3m0 0h13l-3 5 3 5H5',journal:'M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4',household:'m2 11 10-8 10 8M5 9v12h14V9m-10 12v-7h6v7',workshop:'m5 20 11-12M13 3l8 7-4 4-8-7 4-4ZM4 16l4 4',lore:'M3 4c4-2 7-1 9 1 2-2 5-3 9-1v16c-4-2-7-1-9 1-2-2-5-3-9-1V4Zm9 1v16m-6-12h3m6 0h3',character:'M6 3h12v12l-6 6-6-6V3Zm9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-7 7c1-3 7-3 8 0',party:'m12 2 8 4v8c-1 4-4 6-8 8-4-2-7-4-8-8V6l8-4Zm0 4v12m-4-7h8',career:'m3 9 9-6 9 6M3 9h18M5 9v11m14-11v11M3 20h18m-9-9v7',health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',legacy:'M12 3v6M4 21v-6h16v6M12 9v12M4 15h16M9 3h6',inventory:'M8 3h8l-2 5c5 2 7 5 6 10-1 4-15 4-16 0-1-5 1-8 6-10L8 3Zm0 5h8m-4 4v5'};
  return `<svg class="ui-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${(paths[id]||paths.life).startsWith('<')?paths[id]:`<path d="${paths[id]||paths.life}"/>`}</svg>`;
}
const navigationGroups=[
 ['Your Life',[['life','Life'],['activities','Activities'],['map','Explore'],['relationships','Relationships'],['inventory','Inventory'],['journal','Journal']]],
 ['Character',[['character','Character'],['party','Party'],['legacy','Family history']]],
];
function navigationLabel(id,label){return id==='journal'&&game?.farm&&farmView(game)?'The Book':label;}
function groupedNavigation(){return navigationGroups.map(([name,rows])=>`<details class="navigation-group" open><summary>${e(name)}</summary>${rows.map(([id,label])=>`<button type="button" class="nav-item ${tab===id?'active':''}" data-op="tab" data-id="${id}" ${tab===id?'aria-current="page"':''}>${uiIcon(id)}<span>${e(navigationLabel(id,label))}</span></button>`).join('')}</details>`).join('');}
function sidebar() {
 const main=navigationGroups[0][1].map(([id,label])=>[id,navigationLabel(id,label)]);
 return `<aside class="sidebar game-rail"><button class="brand" type="button" data-op="menu" aria-label="Open game menu"><span class="brand-title">Hearth &amp; Oath</span><small>VOLUME I</small></button><nav aria-label="Main views">${main.map(([id,label])=>`<button type="button" class="nav-item ${tab===id?'active':''}" data-op="tab" data-id="${id}" aria-label="${label}" title="${label}" ${tab===id?'aria-current="page"':''}>${uiIcon(id)}<span>${label}</span></button>`).join('')}</nav><div class="rail-footer">${button('Character','tab','character','ghost small')}${button('Party','tab','party','ghost small')}${button('Main Menu','title-menu','','ghost small')}${button('Settings','game-settings','','ghost small')}<small>v0.72.3</small></div></aside>`;
}
function ageControlState() {
  let reason='';
  if(game.phase==='retired')reason='This life has reached its final page.';
  else if(game.battle)reason='Finish the encounter before the year can turn.';
  else if(game.event)reason=game.age<3?'Continue watching before time can pass.':'Make your choice before the year can turn.';
  else if(game.conversations?.pending)reason='A reply is waiting. Return to the conversation, or open Life → Today.';
  else if(game.hero.condition?.type==='vampire'&&game.hero.condition.hunger>=75)return {reason:'',continuing:!!game.timeline?.yearTarget,needsBlood:true};
  else if(game.justice?.prison)reason='Continue or review your sentence in Life → Today.';
  else if(game.adventuring?.expedition)reason='Continue or withdraw from your descent in Life → Today.';
  else if(game.maze||game.delve||game.dungeon)reason='Leave or finish the expedition first.';
  else if(game.cartography?.pending)reason='Continue your journey or turn back in Explore.';
  else if(game.workshop?.project)reason='Continue or abandon your workshop project in Life → Today.';
  else if(game.careers?.batch)reason='Continue or end your current work from Activities.';
  else if(getLifeCommitment(game))reason='Continue or withdraw from the commitment shown in Life.';
  else if(game.timeline?.journey)reason='Continue your journey before aging up.';
  else if(game.life?.plan)reason='Continue your saved year before beginning another.';
  return {reason,continuing:!!game.timeline?.yearTarget};
}
function ageForecast() {
  if(!game?.householdBudget||game.age<18||game.phase==='retired')return '';
  const target=game.timeline?.yearTarget??(game.timeline?.mode==='birth'?(game.timeline.birthDay||0)+(game.age+1)*365:game.day+365), days=Math.max(0,target-game.day);
  const quote=householdCostPreview(game,days), income=Math.round(careerView(game).wages.annual*annualWorkRatio(game)*days/365);
  const returns=questReturnForecast(game).filter(row=>!row.paused&&!row.ready&&row.dueDay<=target).length;
  return `${days} days to birthday · ~${quote.totalDue}g living costs.${returns?` ${returns} chosen ${returns===1?'story returns':'stories return'} by this birthday.`:''}`;
}
function ageButton(cls='') {
  const {reason,continuing,needsBlood}=ageControlState();
  // A season at a time, for lives of the new edition: it stops only for things that matter.
  const season=game.hero?.station&&!needsBlood&&!continuing&&game.age>=3?`<button class="button secondary age-up-button season-button ${cls}" type="button" data-op="live-season" ${reason?'disabled':''} aria-describedby="${cls.includes('desktop')?'desktop-age-reason':'command-age-reason'}"><span>Live the season</span><strong>¼</strong></button>`:'';
  return `${season}<button class="button primary age-up-button ${cls}" type="button" data-op="${needsBlood?'blood-need':continuing?'continue-age':'age-up'}" ${reason?'disabled':''} aria-describedby="${cls.includes('desktop')?'desktop-age-reason':'command-age-reason'}"><span>${needsBlood?'Meet blood hunger':observationalInfancy(game)?continuing?'Continue watching':'Let time pass':continuing?(game.timeline?.season?'Continue season':'Continue year'):'Age up'}</span><strong>${needsBlood?'◐':continuing?'→':'+1'}</strong></button>`;
}
function bottomNav() {
  if(!game)return '';
  const mobileTabs=navigationGroups[0][1].map(([id,label])=>[id,navigationLabel(id,label)]);
  // Short visible labels for a 7-button phone bar; the full name stays the accessible name.
  const MOBILE_TAB_LABELS={relationships:'People',activities:'Activity'};
  return `<div class="mobile-command-dock"><nav class="bottom-nav" aria-label="Mobile main views">${mobileTabs.map(([id,label])=>`<button type="button" data-op="tab" data-id="${id}" class="${tab===id?'active':''}" ${tab===id?'aria-current="page"':''} aria-label="${label}">${uiIcon(id)}<span>${MOBILE_TAB_LABELS[id]||label}</span></button>`).join('')}<button type="button" data-op="menu" data-id="nav" aria-label="Open game menu" aria-expanded="${modal==='menu'}" aria-controls="menu-drawer">${uiIcon('menu')}<span>Menu</span></button></nav></div>`;
}
function commandbar(){const {reason,continuing,needsBlood}=ageControlState();return `<footer class="game-commandbar"><div class="command-note" id="command-age-reason">${e(reason||ageForecast()||(continuing?'Continue this year when you are ready.':'Your next birthday begins another chapter.'))}</div><div class="command-age-control">${button('Menu','menu','','ghost small command-menu-button')}${ageButton('command-age-button')}</div></footer>`;}
function statusBars() {
  const h=game.battle?.actors.find(a=>a.id==='hero')||game.hero;
  const stats=[['health','Health',h.hp,h.maxHp,`${h.hp}/${h.maxHp}`],['joy','Joy',game.life?.happiness??50,100,`${game.life?.happiness??50}%`],['focus','Focus',h.mp,h.maxMp,`${h.mp}/${h.maxMp}`],['stress','Stress',game.life?.stress??0,100,`${game.life?.stress??0}%`]];
  return `<div class="status-bars" aria-label="Character status">${stats.map(([id,label,value,max,display])=>`<div class="status-bar" data-stat="${id}"><div class="bar-caption"><span>${label}</span><strong>${e(display)}</strong></div><div class="bar-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.max(1,max)}" aria-valuenow="${value}"><div class="bar-ink" style="width:${max?Math.max(0,Math.min(100,value/max*100)):0}%"></div></div></div>`).join('')}</div>`;
}
function topbar() {
  if(!game)return `<header class="game-header welcome-header"><span class="eyebrow">HEARTH &amp; OATH / VOLUME I</span>${saved?button(`Continue ${e(saved.hero.name)} →`,'resume','','secondary small'):button('How to play','help','','ghost small')}</header>`;
  const h=game.hero,hereLabel=game.cartography?.offsite?'Wilderness trail':location()?.name,hereMode=game.cartography?.offsite?'country':'settlement';
  const ambition=farmView(game)?.ambition;
  const unread=unreadNotifications(game),inboxButton=`<button type="button" class="button ghost header-inbox" data-op="notifications" aria-label="Open Inbox${unread?' · '+unread+' Unread':''}" aria-expanded="${modal==='inbox'}" aria-controls="notification-inbox">${uiIcon('notifications')}${unread?`<span class="inbox-count">${unread>99?'99+':unread}</span>`:''}</button>`;
  return `<header class="game-header phone-header"><div class="header-person"><button class="button ghost menu-trigger" type="button" data-op="menu" data-id="header" aria-label="Open game menu" aria-expanded="${modal==='menu'}" aria-controls="menu-drawer">${uiIcon('menu')}</button><button class="identity-bar" data-op="tab" data-id="character" aria-label="Open character">${renderAvatar(h,{size:'small',age:game.age})}<span><strong>${e(h.name)}</strong><span>Age <b>${game.age}</b> · ${e(h.specialization?title(h.specialization):h.path==='unformed'?(h.profession==='Unemployed'?'A future unwritten':h.profession):title(h.path))}</span>${ambition?`<small class="header-ambition">${e(ambition.title)}</small>`:''}</span></button><button class="header-place" type="button" data-op="place-open" aria-label="Open your present location"><strong>${e(hereLabel)}</strong><small>${e(date())}</small></button><div class="header-resources">${isIronman(game)?`<span class="ironman-mode" data-ironman-status data-phase="${ironmanSavePending()?'pending':'ready'}">Ironman</span>`:''}${inboxButton}<span class="coin-count" title="Savings">◈ <strong>${h.gold}g</strong></span>${button('◇','tab','inventory','ghost small')}</div></div>${statusBars()}</header>`;
}

function creation() { return (entryNotice?`<p class="notice warning" role="status">${e(entryNotice)}</p>`:'')+renderCharacterCreator(creatorDraft, creatorStep,{notice:creatorNotice,canUndo:!!creatorUndo,error:creatorError,busy:creatingLife,slotSummary:'Save slot '+(activeSlot+1)+(saved?' · replaces '+saved.hero.name:' · empty slot')}); }
function titleArtwork() { return '<div class="title-backdrop" aria-hidden="true"></div><div class="title-vignette" aria-hidden="true"></div>'; }
function menuItem(label, op, {disabled=false, detail='', id='', className=''}={}) {
  return `<button type="button" class="title-menu-item ${className}" data-op="${op}" data-id="${e(id)}" ${disabled?'disabled':''}><span class="title-item-copy">${e(label)}${detail?`<small>${e(detail)}</small>`:''}</span><span class="menu-arrow" aria-hidden="true">→</span></button>`;
}
function titleScreen() {
  const occupied=saveStore.list().filter(slot=>slot.state||slot.kept);
  const newest=list=>list.find(slot=>slot.id===activeSlot)||[...list].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))[0];
  const admitted=occupied.filter(slot=>slot.state),kept=occupied.filter(slot=>!slot.state);
  const recent=newest(admitted),keptRecent=recent?null:newest(kept);
  const live=Boolean(recent&&recent.id===activeSlot&&game),state=live?game:recent?.state;
  const card=state?returnLifeCardView(state,slotSaveHealth(recent.id,live),{live,readCommitment:getLifeCommitment}):null;
  const place=state?properPlaceName(state.world.locations.find(place=>place.id===state.locationId)?.name||state.world.name):'';
  const primary=state?`<article class="title-life" data-return-life-card data-slot-live="${live}" aria-label="Your current life"><button type="button" class="title-menu-item title-continue-card" data-op="title-continue" data-id="${recent.id}"><span class="title-life-portrait" aria-hidden="true">${renderAvatar(state.hero,{size:'small',age:state.age??18})}</span><span class="title-life-copy"><span class="title-action-label">Continue</span><strong>${e(state.hero.name)}</strong><small>Age ${state.age??18} · ${isIronman(state)?'Ironman · ':''}Slot ${recent.id+1}</small>${rulesMarkup(state,{compact:true})}<span class="title-life-place">${e(place)}</span>${card.context?`<span class="title-life-context">${e(card.context)}</span>`:''}</span><span class="menu-arrow" aria-hidden="true">→</span></button><p class="title-source-note" data-slot-source ${card.sourceNote?'':'hidden'}>${e(card.sourceNote)}</p>${saveHealthMarkup(recent.id,{live})}</article>`:menuItem('Begin a new life','title-new',{detail:'Choose an origin, a face and your first year.',className:'title-begin'});
  const keptCard=keptRecent?keptLifeCard(keptRecent.kept,keptRecent.id,{undecoded:true}):'';
  const keptNote=kept.length?` · ${kept.length} kept for the archive`:'';
  return `<main class="title-screen" aria-labelledby="title-heading">${titleArtwork()}<header class="title-topline"><span>A DARK FANTASY LIFE</span>${button(fullscreenLabel(),'fullscreen','','ghost small')}</header><div class="title-content"><h1 id="title-heading" class="title-wordmark"><span>Hearth</span> <span><em>&amp;</em> Oath</span></h1><p class="title-tagline">The world is old.<br>${state?'Your story continues.':'Your story is unwritten.'}</p><nav class="title-menu" aria-label="Title menu">${keptCard}${primary}<div class="title-life-actions">${state?menuItem('New life','title-new'):''}${menuItem('Saved lives','title-load',{disabled:!occupied.length,detail:occupied.length?`${occupied.length} of 3 slots occupied${keptNote}`:'No lives saved in this browser'})}</div><div class="title-secondary">${menuItem('Settings','title-settings')}${menuItem('How to play','help')}${menuItem('Tactics rehearsal','practice-open',{id:'protect_ally',detail:'Practice with a fictional party'})}${menuItem('Import a saved life','import',{detail:'Open an exported save file'})}</div></nav>${!state?saveHealthMarkup(activeSlot):''}</div><footer class="title-footer"><div class="title-settings"><button type="button" class="button ghost small" data-op="music-toggle" aria-pressed="${getAudioSettings().musicEnabled}">♫ Music ${getAudioSettings().musicEnabled?'on':'off'}</button><span>Ambient score · adjustable in Settings</span></div><p class="title-save-note">Saves stay in this browser. Export a file to keep a separate copy.</p><div class="title-bottomline"><span>VOLUME I · THE BOOK OF A LIFE</span><span>v0.72.3</span></div></footer></main>`;
}
/** The rules a life lives by, on its slot and its review: the label, and for an old-rules life the way to the archive. */
function rulesMarkup(state,{slot=null,compact=false,undecoded=false,labelled=true}={}){
  if(!state)return '';
  if(undecoded&&!oldRules(state)){
    const label=`<small class="slot-rules new-rules" data-rules="new">${e(rulesLabel(state))}</small>`;
    return compact?label:`${labelled?label:''}<div class="slot-archive-note" data-archive-note data-refused-life><p>${e(KEPT_UNREADABLE)}</p><div class="slot-row-actions">${slot===null?'':`<button class="button secondary small" type="button" data-op="export-kept" data-id="${slot}">Export this life</button>`}</div></div>`;
  }
  const label=`<small class="slot-rules ${oldRules(state)?'old-rules':'new-rules'}" data-rules="${oldRules(state)?'old':'new'}">${e(rulesLabel(state))}</small>`;
  if(compact||!oldRules(state))return label;
  // An old-rules life here is always one kept as it was stored: it is never decoded.
  return `${labelled?label:''}<div class="slot-archive-note" data-archive-note data-refused-life><p>${e(rulesNote(state))}</p><div class="slot-row-actions">${slot===null?'':`<button class="button secondary small" type="button" data-op="export-kept" data-id="${slot}">Export for the archive</button>`}${archiveLink()}</div></div>`;
}
function archiveLink(cls='ghost small'){return ARCHIVE_URL?`<a class="button ${cls}" href="${e(ARCHIVE_URL)}" target="_blank" rel="noopener" data-archive-link>Open ${e(ARCHIVE_NAME)}</a>`:'';}
/** A kept life's face and place, read from what was stored; an undecoded life is never passed through the engine. */
function keptFace(state,undecoded){try{return renderAvatar(state.hero,{size:'small',age:Number.isInteger(state.age)?state.age:18});}catch{return undecoded?'<span aria-hidden="true">†</span>':'';}}
function keptPlace(state){try{return properPlaceName(state.world?.locations?.find(place=>place.id===state.locationId)?.name||state.world?.name||'');}catch{return '';}}
const keptAge=state=>Number.isInteger(state?.age)?state.age:'unknown';
/** The title card for a life kept for the archive (or kept undecoded): it says so, offers the export and the way there, and opens nothing here. */
function keptLifeCard(state,slot,{undecoded=false}={}){
  const action=undecoded&&!oldRules(state)?'Kept as it was written':'Kept for the archive';
  return `<article class="title-life title-life-kept" data-return-life-card data-refused-life ${undecoded?'data-kept-life':''} aria-label="A life kept for the archive"><div class="title-menu-item title-continue-card title-kept-card"><span class="title-life-portrait" aria-hidden="true">${keptFace(state,undecoded)}</span><span class="title-life-copy"><span class="title-action-label">${action}</span><strong>${e(state.hero.name)}</strong><small>Age ${keptAge(state)} · ${isIronman(state)?'Ironman · ':''}Slot ${slot+1}</small>${rulesMarkup(state,{compact:true,undecoded})}<span class="title-life-place">${e(keptPlace(state))}</span></span></div>${rulesMarkup(state,{slot,undecoded,labelled:false})}</article>`;
}
/** A slot holding a life this build keeps but cannot decode: occupied, exportable, deletable only through review, never opened. */
function keptSlotRow(slot,creating){
  const state=slot.kept,run=isIronman(state),action=creating&&!run?'Replace':oldRules(state)?'Kept for the archive':'Kept as it was written';
  return `<article class="save-slot-row occupied-slot-row" data-kept-life ${run?'data-kept-run':''} aria-label="Saved life slot ${slot.id+1}"><button class="save-slot" type="button" data-op="${creating?'slot-new':'slot-load'}" data-id="${slot.id}" ${creating&&!run?'':'disabled'} data-refused-life><span class="slot-number">0${slot.id+1}</span><span class="slot-portrait">${keptFace(state,true)}</span><span class="slot-info"><strong>${e(state.hero.name)}</strong><span>Age ${keptAge(state)}${run?' · Ironman':''}</span><small>${e(keptPlace(state))}</small>${rulesMarkup(state,{compact:true,undecoded:true})}</span><span class="menu-arrow" aria-hidden="true">${creating&&!run?`${action} →`:action}</span></button><div class="slot-row-actions"><button class="button secondary small slot-export" type="button" data-op="export-kept" data-id="${slot.id}">Export</button>${run?button('Review release or deletion','ironman-review',runIdOf(state),'ghost small'):`<button class="button ghost small slot-delete" type="button" data-op="slot-delete" data-id="${slot.id}" aria-label="Delete ${e(state.hero.name)}">Delete</button>`}</div>${rulesMarkup(state,{slot:slot.id,undecoded:true,labelled:false})}</article>`;
}
function saveSafetyHint(){return coordinateSave.locking()?'Close older game tabs after an update.':'This browser cannot lock saves across tabs. Keep only one game tab open to avoid simultaneous save conflicts.';}
function saveSlotRow(slot,creating) {
  if(!slot.state&&slot.kept)return keptSlotRow(slot,creating);
  const live=Boolean(slot.state&&slot.id===activeSlot&&game),state=live?game:slot.state;
  const card=state?returnLifeCardView(state,slotSaveHealth(slot.id,true),{live,readCommitment:getLifeCommitment}):null;
  return `<article class="save-slot-row ${state?'occupied-slot-row':''}" data-return-life-card data-slot-live="${live}" aria-label="Saved life slot ${slot.id+1}"><button class="save-slot ${state?'':'empty-slot'}" type="button" data-op="${creating?'slot-new':'slot-load'}" data-id="${slot.id}" ${(!creating&&!state||creating&&isIronman(state))?'disabled':''}><span class="slot-number">0${slot.id+1}</span><span class="slot-portrait">${state?renderAvatar(state.hero,{size:'small',age:state.age??18}):'<span aria-hidden="true">†</span>'}</span><span class="slot-info"><strong>${state?e(state.hero.name):'An unwritten life'}</strong><span>${state?`Age ${state.age??18} · ${e(roleTitle(state.world.name))}`:'Empty save slot'}</span>${state?`<small>${e(roleTitle(state.world.locations.find(place=>place.id===state.locationId)?.name||''))}</small>${card.context?`<small class="slot-pending-context">${e(card.context)}</small>`:''}<small class="slot-source-note" data-slot-source ${card.sourceNote?'':'hidden'}>${e(card.sourceNote)}</small>${rulesMarkup(state,{compact:true})}`:''}</span><span class="menu-arrow" aria-hidden="true">${creating?(state?'Replace →':'Create →'):'Return →'}</span></button>${isIronman(state)?`<div class="slot-row-actions">${button(live?'Export current Ironman':'Resume to export',live?'export':'slot-load',slot.id,'secondary small')}${button('Review archive or deletion','ironman-review',runIdOf(state),'ghost small')}</div><p>Ironman · combat death ends this run.</p>`:state?`<div class="slot-row-actions"><button class="button secondary small slot-export" type="button" data-op="export-session" data-id="${slot.id}" aria-label="${e(card.exportLabel)}" title="${e(card.exportLabel)}">Export</button><button class="button ghost small slot-delete" type="button" data-op="slot-delete" data-id="${slot.id}" aria-label="Delete ${e(state.hero.name)}">Delete</button></div>${saveHealthMarkup(slot.id,{live:true,exportButton:false,unknownTimeLabel:'Save time unavailable'})}`:''}</article>`;
}
function saveSlotsScreen() {
  const creating=slotsMode==='new';
  return `<main class="menu-screen save-slots-screen">${titleArtwork()}<section class="menu-panel save-slots-panel" aria-labelledby="slot-heading"><div class="creator-topline">${button('← Main menu','title-menu','','ghost small')}<span>HEARTH &amp; OATH / SAVED LIVES</span></div><header class="save-slots-heading"><div class="eyebrow">${creating?'A NEW THREAD':'THE LIVES YOU HAVE WRITTEN'}</div><h1 id="slot-heading">${creating?'Choose a place for your life.':'Which life will you return to?'}</h1><p class="muted">${creating?'Each slot is a separate world. An occupied slot asks before replacement.':'Review your unfinished moment, or export a separate file before returning.'}</p></header>${entryNotice?`<p class="notice warning">${e(entryNotice)}</p>`:''}<div class="slot-list" tabindex="0" role="region" aria-label="Three saved lives">${saveStore.list().map(slot=>saveSlotRow(slot,creating)).join('')}</div><footer class="save-slots-footer"><div class="slot-tools">${button('Import a saved life','import','','secondary small')}${button('Retained Ironman positions','ironman-recoveries','','secondary small')}</div><p class="form-note">Saves stay in this browser.<span class="save-backup-hint"> Export keeps a separate JSON file, without changing browser save status.</span><span class="save-backup-hint">${e(saveSafetyHint())}</span></p></footer></section></main>`;
}
function settingsScreen() {
  return `<main class="menu-screen">${titleArtwork()}<section class="menu-panel settings-panel"><div class="creator-topline">${button('← Main menu','title-menu','','ghost small')}<span>HEARTH &amp; OATH / SETTINGS</span></div><div class="eyebrow">TUNE THE ATMOSPHERE</div><h1>Sound &amp; display</h1>${audioSettingsPanel()}${displaySettingsPanel()}<p class="muted">Original ambient music follows settlements, shrines, coast, woodland, journeys, depths and battle. Quiet phrases leave room for reading.</p><div class="slot-tools">${button(fullscreenLabel(),'fullscreen','','secondary')}${button('← Main menu','title-menu','','ghost')}</div></section></main>`;
}
function beginCreator(id) {
  if(!leaveIronman())return;
  resetGearOrganizerView();
  mapScale=1;chartSheet='local';chartGrid=false;
  creationRun++;creatingLife=false;
  questInvitations='preview';questArchiveQuery='';questCategory='main';
  nearbyPage=0;nearbyQuery='';peopleScope='family';peopleQuery='';peoplePage=0;workspaceSections={};selectedHex=null;workspaceReturn=null;spatialMode='country';spatialPane='map';peoplePane='conversations';packPane='equipment';packGoal='none';gearFilter='all';inventoryQuery='';inventorySort='type';inventoryCategory='all';inventoryItem=null;craftFinish='plain';economyGoal='road';activitiesPane='daily';activeSlot=Number(id);saveStore.select(activeSlot);saved=saveStore.read(activeSlot);game=null;modal=null;overwriteSlot=null;
  entryNotice='';creationSeed=randomSeed();creatorDraft=normalizeCreatorDraft(defaultCreatorDraft(creationSeed));creatorBaseline=JSON.stringify(creatorDraft);creatorStep=0;screen='creation';creatorUndo=null;creatorNotice='';creatorError='';creatorDirty=false;creationCandidate=null;creationSlotToken=saveStore.reviewToken(activeSlot);
  disclosureStates.clear();conversationPositions.clear();circlePosition=0;selectedContact=null;selectedLocation=null;render();
  focusRoute('#creator-heading-0');
}
function showTitle({discardDraft=false}={}) {
  if(screen==='creation'&&!discardDraft)captureCreation();
  if(screen==='creation'&&!discardDraft&&creatorDirty){requestCreatorLeave('title');return;}
  if(ironmanFenced())return;
  cancelInventoryDrag();appViewEpoch++;
  pendingPersonalNote=null;
  if(activeSaveConflict()){openModal('save-conflict');return;}
  resetGearOrganizerView();
  notificationToasts=[];clearTimeout(notificationTimer);
  creationRun++;creatingLife=false;
  if(screen==='game')save();
  const returnOp=screen==='settings'?'title-settings':screen==='slots'?(slotsMode==='load'?'title-load':'title-new'):game?'title-continue':'title-new';
  modal=null;screen='title';entryNotice='';render();focusRoute(`[data-op="${returnOp}"]`);
}
function loadSlot(id) {
  if(ironmanFenced())return false;
  const displayed=saveStore.read(Number(id));
  if(!displayed||!admitLifeEntry(displayed))return false;
  if(isIronman(displayed))return {ironmanLoad:{runId:runIdOf(displayed),slot:Number(id)}};
  if(!leaveIronman())return false;
  journalScope=null;pendingPersonalNote=null;
  resetGearOrganizerView();
  spatialMode='country';spatialPane='map';peoplePane='conversations';packPane='equipment';packGoal='none';gearFilter='all';inventoryQuery='';inventorySort='type';inventoryCategory='all';inventoryItem=null;craftFinish='plain';economyGoal='road';activitiesPane='daily';
  const state=displayed;
  questInvitations='preview';questArchiveQuery='';questCategory='main';
  activeSlot=Number(id);saveStore.select(activeSlot);tab='life';modal=null;game=null;inventoryQuery='';inventorySort='type';inventoryCategory='all';inventoryItem=null;selectedContact=null;selectedLocation=null;selectedTarget=null;selectedAllyTarget=null;mapScale=1;chartSheet=state.world.map?.generationVersion>=7?'local':window.innerWidth<=650?'local':'country';chartGrid=false;feedPosition=0;feedCount=0;disclosureStates.clear();conversationPositions.clear();circlePosition=0;workspaceSections={};nearbyPage=0;nearbyQuery='';peopleScope='family';peopleQuery='';peoplePage=0;const view=readWorkspace(state,storage);if(view){inventoryQuery=typeof view.inventoryQuery==='string'?view.inventoryQuery.slice(0,100):'';inventorySort=['type','name','rarity','value','score'].includes(view.inventorySort)?view.inventorySort:'type';inventoryCategory=['all','equipment','supplies','materials','loot'].includes(view.inventoryCategory)?view.inventoryCategory:'all';inventoryItem=typeof view.inventoryItem==='string'?view.inventoryItem:null;if(view.workspaceSections&&typeof view.workspaceSections==='object')for(const route of Object.keys(WORKSPACE_SECTIONS))workspaceSections[route]=workspaceSection(route,view.workspaceSections[route]);if(['life','map','relationships','activities','quests','adventure','realm','journal','household','career','legacy','health','workshop','lore','character','party','inventory','place'].includes(view.tab))tab=view.tab;selectedLocation=typeof view.selectedLocation==='string'?view.selectedLocation:null;selectedHex=typeof view.selectedHex==='string'?view.selectedHex:null;mapScale=Math.max(1,Math.min(4,Number(view.mapScale)||1));chartSheet=paperMapSheets(state,{view:cartographyView(state)}).some(s=>s.id===view.chartSheet)?view.chartSheet:state.world.map?.generationVersion>=7?'local':window.innerWidth<=650?'local':'country';chartGrid=view.chartGrid===true;workspaceReturn=view.workspaceReturn==='map'?'map':null;spatialMode=['country','settlement','dungeon'].includes(view.spatialMode)?view.spatialMode:'country';spatialPane=view.spatialPane==='actions'?'actions':'map';peoplePane=['conversations','bonds','society'].includes(view.peoplePane)?view.peoplePane:'conversations';packPane=['equipment','bag','merchant','craft','relics'].includes(view.packPane)?view.packPane:'equipment';packGoal=BUILD_GOALS.some(g=>g.id===view.packGoal)?view.packGoal:'none';gearFilter=['all',...EQUIPMENT_SLOTS].includes(view.gearFilter)?view.gearFilter:'all';activitiesPane=ACTIVITY_TABS.some(r=>r[0]===view.activitiesPane)?view.activitiesPane:'daily';selectedContact=typeof view.selectedContact==='string'?view.selectedContact:null;}if(state.timeline?.journey||state.cartography?.route){selectedLocation=state.timeline?.journey?.destinationId||state.cartography.route.destination;selectedHex=null;}inventoryFavoritesOnly=view?.inventoryFavoritesOnly===true;update(state);
}
function adoptCreatorDraft(next,{message=''}={}){
 if(JSON.stringify(next)===JSON.stringify(creatorDraft))return false;
 const before=creatorDraft;creatorUndo=structuredClone(before);creatorDraft=next;creatorDirty=JSON.stringify(next)!==creatorBaseline;creationCandidate=null;creatorError='';
 const dependent=creatorDependencyChanges(before,next);creatorNotice=dependent.length?dependent.join(' ')+' The undo arrow restores your previous choices.':message;return true;
}
function captureCreation() {
  const form=root.querySelector('#character-form');if(form)adoptCreatorDraft(captureCreatorDraft(form,creatorDraft));
}
function requestCreatorLeave(to){if(creatingLife)return;captureCreation();if(!creatorDirty){if(to==='slots'){screen='slots';slotsMode='new';render();focusRoute('#slot-heading');}else showTitle({discardDraft:true});return;}creatorLeaveTo=to;openModal('creator-leave',root.querySelector('[data-op="creator-back"]'));}


function routinePlannerPanel(){const actions=actionsForUI(game),offers=routineOffers(game,actions);if(getLifeCommitment(game)||!offers.length)return '';return `<details class="panel routine-planner"><summary>Plan a few ordinary days</summary><p>Review up to seven days of one activity. Every session uses its real time, fee and needs. Decisions, birthdays, changed health and unfinished work stop the routine.</p>${offers.map(a=>`<article><h3>${e(a.label)}</h3><p>${e(a.description)}</p>${button('Review '+a.cycles+' sessions · up to '+a.maxDays+' days','routine-review',a.id+':'+a.cycles,'secondary small')}</article>`).join('')}</details>`;}

function offerCombatRisk(id) {
  if(isMazeEntry(game,id))return null;
  let encounterId={forest_expedition:'forest',ruin_expedition:'ruin'}[id],context=null;
  if(id.startsWith('adventure_roam_')){encounterId='free_'+id.slice(15);context={kind:'adventure',mode:'roam',token:`roam-${game.flags.battlesStarted||0}`,locationId:game.locationId};}
  if(id.startsWith('adventure_pursue_')){const c=game.adventuring?.contracts.find(c=>c.id===id.slice(17));if(c){encounterId='free_'+c.targetType;context={kind:'adventure',mode:'contract',token:c.id,locationId:game.locationId};}}
  return encounterId?encounterOutlook(game,encounterId,context):null;
}
function offerCombatNote(id) { const risk=offerCombatRisk(id);return risk?`<small class="combat-offer" data-combat-offer>${e(risk.summary)} You can prepare or choose other work.</small>`:''; }
function offeredButton(id,label,cls='primary',showTime=true) {
  const action=actionsForUI(game).find(a=>a.id===id);
  return action?`<div class="offered-action">${button(e(label||action.label),'activity',id,cls,!!action.disabledReason)}<small>${e(action.disabledReason||(showTime?`${actionCostSummary(game,action)}`:''))}</small>${showTime?livingCosts(action.durationDays??action.days):''}${offerCombatNote(id)}</div>`:'';
}
function historyList(history) {
  return (history||[]).slice(-6).reverse().map(h=>`<article class="remembered-entry"><strong>${e(h.title||h.label||title(h.id||'Remembered'))}</strong>${paragraphs(h.text||h.summary||h.description||'')}${h.cost===undefined&&h.days===undefined?'<small class="muted">This account keeps the words recorded at the time; separate itemized changes were not retained.</small>':''}</article>`).join('');
}
function householdBasePage(ui=uiHelpers()) {
  const v=householdView(game), f=v.family, school=v.education, actions=actionsForUI(game);
  return chapter(ui.section==='learning'?(game.age<16?'School':'Education'):'Home & Education',f.summary,'THE LIFE AT YOUR HEARTH')+selectSection(ui,{home:`<section class="panel family-overview"><div class="section-heading"><h2>${e(f.setupLabel)}</h2><span class="badge">${e(f.housingLabel)}</span></div>${meter(f.support,100,'Household support')}<div class="family-grid">${f.members.map(m=>`<article class="family-member ${m.availability!=='present'?'absent':''}"><div class="family-face">${m.availability==='present'?renderAvatar(m,{size:'small',age:m.age??30}):'<span aria-hidden="true">✧</span>'}</div><div><h3>${e(m.name)}</h3><p>${e(title(m.relationship))}${m.age!==null&&m.age!==undefined?` · Age ${m.age}`:''}</p><span class="badge">${e(title(m.availability))}</span>${m.bond!==null&&m.bond!==undefined?`<small>Bond ${m.bond}</small>`:''}${m.personId&&m.availability==='present'?button('Talk together','show-contact',m.personId,'ghost small'):''}</div></article>`).join('')}</div>${actionCards(actions.filter(a=>a.id.startsWith('family_')))}</section>`,learning:`<section class="panel school-overview"><div class="eyebrow">A PLACE TO LEARN</div><h2>${e(school.schoolName||'Your education is still open')}</h2><p>${e(school.summary)}</p><div class="education-progress"><div><span>Learning route</span><strong>${e(school.routeLabel||'Not enrolled')}</strong></div><div><span>Attendance</span><strong>${school.attendance}</strong></div><div><span>Progress</span><strong>${school.progress}</strong></div><div><span>Performance</span><strong>${school.performance}/100</strong></div></div>${school.teacher&&game.age>=6?`<div class="school-mentor"><span>Teacher · <strong>${e(school.teacher.name)}</strong></span>${button('Talk with your teacher','show-contact',school.teacher.id,'ghost small')}</div>`:''}${school.scholarship?'<span class="badge">Sponsored education</span>':''}${school.qualifications.length?`<div class="qualification-list">${school.qualifications.map(q=>`<span class="badge">${e(typeof q==='string'?title(q):q.label||q.name||title(q.id))}</span>`).join('')}</div>`:''}${schoolingPanel(game,e)}${renderCourseRecords(school.courses,ui)}<details class="school-options" data-disclosure="learning-routes" ${school.enrolled?'':'open'}><summary>Choose a learning route</summary><div class="school-routes">${school.routes.map(r=>`<article class="school-route"><h3>${e(r.name)}</h3><p>${e(r.description)}</p><span class="badge">Age ${r.minAge}+</span>${offeredButton(r.actionId)}${r.disabledReason?`<p class="disabled-reason">${e(r.disabledReason)}</p>`:''}</article>`).join('')}</div></details>${actionCards(actions.filter(a=>a.id.startsWith('school_')&&!school.routes.some(r=>r.actionId===a.id)))}</section>`,records:`<div class="household-history"><section class="panel"><h2>Family memories</h2>${historyList(f.history)||'<p class="muted">Shared years and decisions will become part of this household’s story.</p>'}</section><section class="panel"><h2>School records</h2>${historyList(school.history)||'<p class="muted">Enrollment, lessons, and examinations belong here.</p>'}</section></div>`});
}
function materialNeeds(materials) {
  return Object.entries(materials||{}).filter(([,n])=>n>0).map(([id,n])=>`<span>${e(id==='wood'?'Timber':title(id))} <strong>${n}</strong></span>`).join('')||'<span>No materials</span>';
}
function supplyGuidePanel(){const g=projectSupplyGuide(game);if(!g)return '';return `<details class="panel" open><summary>${e(g.milestone)} · ${e(g.siteName)}</summary><p>${g.committed?`${g.cost} gold and the listed supplies are already reserved. ${g.remainingDays} work days remain; continue at the recorded site without gathering or paying again.`:'Only the next uncommitted milestone is counted below.'}</p><p>${Object.entries(g.shortfall).map(([k,n])=>`${n} ${e(k)}`).join(', ')||(g.committed?'No new materials needed':'Materials for the next milestone are in your bag')}${g.goldShortfall?`; ${g.goldShortfall} gold still needed`:''}.</p>${g.sources.map(v=>`<p>${e(v.material)} at ${e(v.siteName)} · ${e(v.known)} ${button('Show known route','quest-location',v.siteId,'ghost small')}</p>`).join('')}${button('Return to the recorded project site','quest-location',g.siteId,'secondary small')}<p class="small-copy">Planning spends nothing. Known routes retain their actual days, needs and prices.</p></details>`;}
function projectPanel(v=workshopView(game)) {
  return v.project?`<section class="panel project-panel"><div class="eyebrow">WORK IN PROGRESS</div><h2>${e(v.project.title)}</h2><p>${e(v.project.description)}</p>${meter(v.project.totalDays-v.project.remainingDays,v.project.totalDays,'Days completed')}<p>${v.project.remainingDays} working days remain. Reserved resources are recorded with this project. Abandoning it forfeits the committed gold and supplies.</p><div class="project-actions">${offeredButton('workshop_continue','Continue the project')}${offeredButton('workshop_cancel','Abandon this project','ghost')}</div></section>`:'';
}
function reviewProjectAbandonment(trigger){const p=game?.workshop?.project;if(modal||!p||!actionsForUI(game).some(a=>a.id==='workshop_cancel'&&!a.disabledReason))return;projectAbandonReview={state:game,snapshot:JSON.stringify(p),project:structuredClone(p)};openModal('project-abandon',trigger);}
function workshopPage() {
  const v=workshopView(game), recipes=v.recipes.map(r=>craftFinish==='plain'?r:r.finishes.find(f=>f.id===craftFinish)||r).filter(r=>gearFilter==='all'||r.slot===gearFilter);
  const utilities=actionsForUI(game).filter(a=>a.id.startsWith('workshop_')&&!/^workshop_(gather_|craft_|fitted_|pattern_|build_|continue$|cancel$)/.test(a.id));
  const build=r=>`<article class="panel blueprint-card"><div class="eyebrow">${r.slot?e(title(r.slot)):'A PLACE OF YOUR OWN'}</div><h3>${e(r.name)}</h3><p>${e(r.description)}</p>${r.benefit?`<p class="blueprint-benefit">${e(r.benefit)}</p>`:''}<div class="craft-requirements"><span class="badge">Craftsmanship ${r.requiredCrafting??0}+</span>${r.tier?`<span class="badge">Workbench ${r.tier}+</span>`:''}</div><div class="recipe-materials">${materialNeeds(r.materials)}</div><p class="recipe-time">${r.days} days · ${r.cost} gold</p>${r.quote?`<p class="small-copy craft-return">Output: 1 piece · ${e(r.quote.quality)}. ${r.quote.localQuote?'Local merchant':'Indicative merchant'} receipt ${r.quote.receipt}g − ${r.quote.fee}g fee − ${r.quote.materialValue}g ingredients at replacement prices − about ${r.quote.living}g living = <strong>${r.quote.netValue>=0?'+':''}${r.quote.netValue}g net value</strong> over ${r.quote.days} days. ${r.quote.cashNet>=0?'+':''}${r.quote.cashNet}g cash after fee and living costs when inputs are already owned. Gathering, sourcing travel and future price changes add their own time or costs.</p>`:''}${offeredButton(r.actionId,r.slot?'Craft this piece':'Begin construction','primary',false)}${r.disabledReason?`<p class="disabled-reason">${e(r.disabledReason)}</p>`:''}</article>`;
  const catalog=[1,2,3].map(tier=>{const pieces=recipes.filter(r=>r.tier===tier);return pieces.length?`<details class="construction-section recipe-tier" data-disclosure="recipe-tier-${tier}" ${game.age>=16&&workshopTier(game)>=tier?'open':''}><summary>Tier ${tier} designs <span class="badge">${pieces.length}</span></summary><div class="blueprint-grid">${pieces.map(build).join('')}</div></details>`:'';}).join('');
  const materials=`<section class="panel resource-store"><div class="section-heading"><h2>Your materials</h2><span class="badge">Craftsmanship ${v.crafting}</span></div><div class="resource-grid">${v.materials.map(m=>`<div><span>${e(m.label)}</span><strong>${m.amount}</strong></div>`).join('')}</div>${button('Open equipment →','tab','inventory','ghost small')}</section>`;
  return chapter('Craft & build',v.summary,'YOUR WORKBENCH')+selectSection(uiHelpers(),{projects:materials+projectPanel(v)+supplyGuidePanel()+(!v.project?'<p>Choose an equipment design or a building to begin. Its days, supplies and fee are reviewed before commitment.</p>':''),gathering:`<section><div class="section-heading"><h2>Gather resources</h2><span>${e(location()?.name)}</span></div>${actionCards(v.gathering)}</section>`,buildings:`<section class="panel built-places"><h2>Your places</h2>${v.structures.length?`<div class="structure-grid">${v.structures.map(b=>`<article class="structure-card"><span class="badge ${b.condition==='lost'?'warning':''}">${e(title(b.condition))}</span><h3>${e(b.name)}</h3><p>⌖ ${e(game.world.locations.find(p=>p.id===b.locationId)?.name||b.locationId)}</p><p>${e(b.benefit)}</p>${button('Show on map','quest-location',b.locationId,'ghost small')}</article>`).join('')}</div>`:'<p class="muted">Build shelter, a cottage, a forge, or a useful room. Each belongs to a real location and can be affected by its future.</p>'}</section>${utilities.length?`<section><div class="section-heading"><h2>Tend your home &amp; workshop</h2></div>${actionCards(utilities)}</section>`:''}<details class="construction-section" data-disclosure="buildings" ${v.structures.length===0?'open':''}><summary>Build a home and useful rooms</summary><div class="blueprint-grid">${v.buildings.map(build).join('')}</div></details>`,equipment:materials+`<section class="craft-catalog"><div class="section-heading"><h2>Equipment to make</h2><span>${v.recipes.length} recipes</span></div><div class="craft-filters" role="group" aria-label="Recipe category">${[['all','All'],...EQUIPMENT_SLOTS.map(slot=>[slot,SLOT_NAMES[slot]])].map(([id,label])=>button(label,'gear-filter',id,`secondary small ${gearFilter===id?'active':''}`,false,gearFilter===id)).join('')}</div><div class="craft-filters" role="group" aria-label="Equipment finish">${[['plain','Standard design'],...(v.patterns || []).map(p=>[p.id,p.name+(p.learned?'':' · study first')])].map(([id,label])=>`<button type="button" class="button ghost small ${craftFinish===id?'active':''}" data-op="craft-finish" data-id="${id}" aria-pressed="${craftFinish===id}">${e(label)}</button>`).join('')}</div><p class="small-copy">Standard recipes make the named design. Learned patterns make repeatable sound gear with one chosen affix; three matching pieces form its existing set. Rare dungeon pieces can exceed this quality. Nothing is equipped automatically.</p><details class="construction-section" data-disclosure="artisan-patterns"><summary>Study artisan equipment patterns</summary>${actionCards(actionsForUI(game).filter(a=>a.id.startsWith('workshop_pattern_')))}</details>${catalog||'<p class="muted">No recipes use this slot in this save.</p>'}</section>`,history:`<section class="panel"><h2>Made with your own hands</h2>${historyList(v.history)||'<p class="muted">Completed gathering, construction, and craft work will be remembered here.</p>'}</section>`});
}
function lorePage() {
  const v=loreView(game), actions=actionsForUI(game).filter(a=>a.id.startsWith('lore_'));
  return chapter(v.title,v.summary,'LORE & DISCOVERIES')+selectSection(uiHelpers(),{culture:`<div class="lore-introduction"><section class="panel culture-card"><div class="eyebrow">LOCAL CULTURE</div><h2>${e(v.culture.name)}</h2>${paragraphs(v.culture.description)}${paragraphs(Array.isArray(v.culture.customs)?v.culture.customs.join('\n'):v.culture.customs)}</section><section class="panel ancestry-card"><div class="eyebrow">ANCESTRY & EXPRESSION</div><h2>${e(v.ancestry.name)}</h2>${paragraphs(v.ancestry.summary)}${paragraphs(v.ancestry.origin)}${paragraphs(Array.isArray(v.ancestry.customs)?v.ancestry.customs.join('\n'):v.ancestry.customs)}<p class="muted">Tradition gives context. Your own preferences and choices shape who you become.</p></section><section class="panel heritage-card"><div class="eyebrow">YOUR FAMILY HERITAGE</div><h2>${e(v.heritage.name)}</h2>${paragraphs(v.heritage.description)}${paragraphs(v.heritage.custom)}<p class="muted">${v.heritage.declared?'Part of your recorded background.':'This older life can confirm its heritage in the portrait gallery.'} Heritage does not choose a calling, faith or moral path.</p>${button('Open portrait book','portraits','','secondary small')}</section></div>`,histories:activitiesPanel(actions)+`<section><div class="section-heading"><h2>Stories beneath the present</h2><span class="muted">Legends can be questioned.</span></div><div class="lore-grid">${v.histories.map(h=>`<article class="panel lore-card ${h.discovered?'discovered':''}"><span class="badge">${h.discovered?'Investigated':'A story to uncover'}</span><h3>${e(h.title)}</h3>${paragraphs(h.text)}</article>`).join('')}</div></section>`,rumors:`<section><h2>Rumors & places</h2><div class="lore-grid">${v.rumors.map(r=>`<article class="panel lore-card"><span class="badge">${r.discovered?'Witnessed':'Unconfirmed'}</span><h3>${e(r.title)}</h3>${paragraphs(r.text)}${r.locationId?button('Follow the place','quest-location',r.locationId,'secondary small'):''}</article>`).join('')}</div></section>`,records:`<section class="panel"><h2>What you learned</h2>${v.records.slice().reverse().map(r=>`<article class="remembered-entry"><strong>${e(r.title)}</strong><small>${e(date(r.day))}</small>${paragraphs(r.text)}</article>`).join('')||'<p class="muted">Visit a record house or ask a local witness. Keep the places, names, and discoveries that matter to your story.</p>'}</section>`});
}
function preferencesPanel() {
  const v=preferenceView(game);
  return `<section class="panel preferences-panel"><div class="section-heading"><h2>The things that feel like you</h2>${button('Edit preferences','preferences','','secondary small')}</div><p>${e(v.summary)}</p><div class="preference-grid">${v.items.map(i=>`<article><span>${e(i.label)}</span><strong>${e(i.value)}</strong><p>${e(i.description)}</p></article>`).join('')}</div>${historyList(v.memories)}</section>`;
}
function preferencesModal() {
  return `<div class="eyebrow">YOUR OWN TASTES</div><h2>What feels like you?</h2><p>Preferences shape enjoyment and conversations. You can change them as your life develops.</p><form id="preferences-form">${preferenceFields(game.hero.preferences)}<div class="modal-buttons"><button class="button primary" type="submit">Keep these preferences</button>${button('Cancel','close-modal','','ghost')}</div></form>`;
}

function wellbeing() {
  if(!game.life) return '';
  return `<div class="wellbeing-grid">${[['happiness','Joy'],['stress','Stress'],['health','Bodily wellbeing']].map(([key,label])=>`<div class="wellbeing-stat ${key}"><span>${label}</span><strong>${game.life[key]}</strong><div class="meter"><div class="meter-fill" style="width:${game.life[key]}%"></div></div></div>`).join('')}</div>`;
}
function conditionPanel(h=game.hero) {
  if(!h.condition) return '';
  const v=curseView(game),m=getMoonForecast(game);
  return `<section class="panel condition-panel ${e(h.condition.type)}"><div class="eyebrow">A CURSE THROUGH A LIFETIME</div><h3>${e(v.title)}</h3><p>${e(v.lore)}</p><p class="small-copy">${e(v.source)} · ${e(v.stage)} · ${e(v.form)}</p>${v.hunger!==null?meter(v.hunger,100,'Blood hunger','hunger-meter')+meter(v.humanity??85,100,'Humanity','focus-meter'):meter(v.control,100,'Control','focus-meter')+meter(v.mastery,100,'Mastery','health-meter')+`<p>Full moon ${m.nextFullMoon} · ${m.prepared?'Refuge prepared':'Refuge needed'}</p>`}<p><strong>${e(v.gift)}</strong> · Lineage lore: ${e(v.weakness)}</p><p class="small-copy" data-curse-mechanics>${e(v.mechanics)}</p><p>${e(v.law)}</p>${actionCards(v.actions.filter(a=>actionsForUI(game).some(x=>x.id===a.id)))}<details><summary>What the curse remembers</summary>${v.history.map(h=>`<p class="small-copy">Day ${h.day} · ${e(h.text)}</p>`).join('')}</details></section>`;
}
function livingCosts(days) {
  const text=householdAccrualText(game,{days});
  return text?`<small class="living-cost-note">${e(text)}</small>`:'';
}
function actionCards(actions) {
  const compare=actions.some(a=>a.id.startsWith('gear_buy_'))?equipmentComparator(game):null;
  return `<div class="quick-actions">${actions.map(a=>{
    const costDetails=actionCostDetails(game,a),days=a.durationDays??a.days??0;
    const card=`<button class="activity-row" data-op="activity" data-id="${e(a.id)}" ${a.disabledReason?'disabled':''}><span class="activity-symbol" aria-hidden="true">${actionIcon(a.group,a.id)}</span><span class="activity-copy"><strong>${e(a.label)}</strong><span>${e(a.description)}</span>${a.detail&&displaySettings.showNumbers?`<small class="action-detail">${e(a.detail)}</small>`:''}${offerCombatNote(a.id)}${a.disabledReason?`<small class="disabled-reason">${e(a.disabledReason)}</small>`:''}${personalityImpactText(game,{kind:'action',id:a.id})?`<small class="nature-impact">${e(personalityImpactText(game,{kind:'action',id:a.id}))}</small>`:''}${costDetails?`<small class="living-cost-note">${e(costDetails)}</small>`:''}</span><span class="activity-cost">${days?`${days}d`:'Now'}${(a.quotedCost??a.cost)?`<br>${e(a.quotedCost??a.cost)}g`:''}</span><span class="choice-arrow" aria-hidden="true">→</span></button>`;
    return compare&&a.id.startsWith('gear_buy_')?`<div class="equipment-shop-offer">${card}${renderEquipmentComparison(compare(a.id.slice(9)),{e},{purchase:true,goal:packGoal})}</div>`:card;
  }).join('')}</div>`;
}
function activitiesPanel(actions) {
  const familyGroups={'Growing up':'People & community','Community':'People & community','Family':'People & community','Practice':'Skills & training','Training':'Skills & training','Livelihood':'Work & career','Career':'Work & career','Everyday life':'Care & recovery','Wellbeing':'Care & recovery','Supplies':'Care & recovery','Ambitions':'Personal goals'};
  if(game.age>=18) actions=actions.map(a=>({...a,group:familyGroups[a.group]||a.group}));
  const groups=[...new Set(actions.map(a=>a.group))];
  return groups.length?`<section class="activities-panel"><div class="section-heading"><h2>${game.age<18?'Explore your growing world':'What will you do?'}</h2><span class="muted">Choose where to put your time.</span></div>${`<nav class="record-tabs" aria-label="Activity subject">${[['all','All subjects'],...groups.map(g=>[g,title(g)])].map(([id,label])=>button(e(label),'filter',id,`ghost small ${actionFilter===id?'active':''}`,false,(groups.includes(actionFilter)?actionFilter:'all')===id)).join('')}</nav>`}${groups.filter(group=>!groups.includes(actionFilter)||group===actionFilter).map((group,i)=>`<details class="activity-section" data-disclosure="activities-${e(group)}" ${i===0||groups.includes(actionFilter)?'open':''}><summary>${e(title(group))}<span>${actions.filter(a=>a.group===group).length}</span></summary>${actionCards(actions.filter(a=>a.group===group))}</details>`).join('')}</section>`:'';
}
function ageProgress() {
  const unlocks=getAgeUnlocks(game);
  const upcoming=unlocks.filter(u=>!u.unlocked).sort((a,b)=>a.minAge-b.minAge).slice(0,3);
  return `<section class="panel growing-life"><div class="section-heading"><div><div class="eyebrow">${e(getLifeStage(game))}</div><h2>${game.age<3?'Your first years':game.age<18?'Becoming yourself':'A life still unfolding'}</h2></div><span class="badge">Age ${game.age}</span></div>${wellbeing()}${upcoming.length?`<div class="age-unlocks">${upcoming.map(u=>`<span title="${e(u.description)}">⌁ ${e(u.label)} <strong>Age ${u.minAge}</strong></span>`).join('')}</div>`:''}${game.workshop?.project?projectPanel():''}${observationalInfancy(game)?'<p class="muted">Days unfold around you. Your caregivers make the decisions while you watch and grow.</p>':game.timeline?.yearTarget?`<p class="muted">This year is paused ${Math.max(0,game.timeline.yearTarget-game.day)} days before your next birthday. Finish the current moment, then continue.</p>`:'<p class="muted">Age up when you are ready. Your next year brings a situation shaped by your life and the world.</p>'}</section>`;
}
function eventScene() {
  const event=voiceEvent(game,game.event);
  const roadPerson=event?.id.startsWith('travel_')?travelEncounterPerson(game):null;
  if(!event)return '';
  if(event.id.startsWith('farm_'))return renderFarmerScene(event,uiHelpers(),{state:game,showNumbers:displaySettings.showNumbers});
  const customer=societyCustomerContext(game,event);
  const preparationNote=event.id==='quest_prepare'&&event.choices.some(c=>c.id==='refuge'&&/^Build /.test(c.label))?'<p class="small-copy" data-preparation-pledge>These preparation choices record pledges from willing hosts and crews using existing rooms, supplies and capacity. The refuge agreement sets aside that support for the transition.</p>':'';
  const route=game.dungeon?dungeonView(game):null;
  const risk=route?.room?.encounterId&&!route.room.resolved?encounterOutlook(game,route.room.encounterId):null;
  const threat=risk?`<section class="combat-outlook" data-encounter-outlook><strong>${e(risk.summary)}</strong><p class="small-copy">${e(risk.caveat)} The peaceful-route checklist shows what alternatives are available; you can also leave and prepare.</p></section>`:'';
  const checklist=route?.negotiation?.length?`<section class="panel" data-negotiation-checklist><h3>Peaceful route</h3>${route.negotiation.map(step=>`<p><strong>${e(step.label)} · ${step.met?'Met':'Missing'}</strong><br><span class="small-copy">${e(step.detail)}</span></p>`).join('')}${route.cacheIsBackground?'<p class="small-copy">The recovered cache supplies and background records are kept separately from examined negotiation evidence.</p>':''}</section>`:'';
  const choiceReason=c=>originChoiceReason(game,event.id,c.id)||lifeChoiceReason(game,event.id,c.id)||societyCustomerChoiceReason(game,event.id,c.id)||(event.id==='stories_chapter'?storyChoiceReason(game,c.id):healthChoiceReason(game,event.id,c.id)||c.disabledReason);
  const renderedChoices=event.choices.map(c=>{const quote=researchChoiceQuote(game,event,c.id)||societyCustomerChoiceQuote(game,event,c.id);return quote?{...c,...quote}:c;});
  return `<article class="panel story-scene"><div class="scene-category"><span class="eyebrow">${e(event.category||'A MOMENT THAT MATTERS')}</span><span class="badge">Age ${game.age}</span></div><h2>${e(event.title)}</h2>${roadPerson?`<div class="scene-person">${renderAvatar(roadPerson,{size:'small',age:roadPerson.age})}<span><strong>${e(roadPerson.name)}</strong><small>Age ${roadPerson.age}</small></span></div>`:''}<div class="story-body">${compactStory(event.body)}${['retirement','homecoming_aftermath'].includes(event.id)&&!event.body.includes('Your quest record:')?`<section class="panel" data-retirement-review>${paragraphs(retirementQuestReview(game))}</section>`:''}</div>${customer?`<p class="small-copy" data-society-customer-context>Request from <strong>${e(customer.name)}</strong> at ${e(customer.locationName)}. The choices below quote the current reservation requirements.</p>`:''}${preparationNote}${threat}${checklist}<div class="choice-grid">${renderedChoices.filter(c=>!c.id.startsWith('route_')||!(game.dungeon||game.adventuring?.expedition)).map((c,i)=>`<button class="choice-card" data-op="choice" data-id="${e(c.id)}"${choiceReason(c)?' disabled':''}><span class="choice-number">${i+1}</span><span><strong class="choice-label">${e(c.label)}</strong><span class="choice-description">${e(c.description)}</span>${c.detail&&displaySettings.showNumbers?`<small class="action-detail">${e(c.detail)}</small>`:''}${event.id==='stories_chapter'||event.id.startsWith('origin_')?livingCosts(c.days):''}${choiceReason(c)?`<small class="disabled-reason">${e(choiceReason(c))}</small>`:''}${c.nature?`<small class="nature-impact">Only because you are ${e(personalityTrait(c.nature)?.name?.toLowerCase()||c.nature)}.</small>`:''}${personalityImpactText(game,{kind:'choice',eventId:event.id,id:c.id,intentTags:c.intentTags})?`<small class="nature-impact">${e(personalityImpactText(game,{kind:'choice',eventId:event.id,id:c.id,intentTags:c.intentTags}))}</small>`:''}</span><span class="choice-arrow">→</span></button>`).join('')}</div></article>`;
}
function lifeMap() {
 const local=nearbyContacts(game),place=location(),active=trackedQuest(game);
 return `<aside class="life-surroundings" aria-label="Your surroundings">${!game.cartography?.offsite?renderAreaScene(game,uiHelpers(),{site:place}):''}<span class="eyebrow">WHERE YOU ARE</span><h2>${e(game.cartography?.offsite?'The open country':place?.name)}</h2><p>${e(game.cartography?.offsite?'Your last hearth is behind you. Cross the country one neighboring path at a time.':(game.realm?.politics?.holds.some(h=>h.siteId===game.locationId&&h.status==='held')?currentPlaceSummary(game):place?.description)||'')}</p>${button('Explore Your Location','place-open','','secondary')}${local.length?`<section class="people-at-place"><h3>People in this settlement</h3>${local.slice(0,4).map(p=>`<button type="button" class="nearby-person" data-op="spatial-contact" data-id="${e(p.id)}">${renderAvatar(p,{size:'small',age:p.age})}<span>${e(p.name)}<small>${e(roleTitle(p.role))}</small></span><span aria-hidden="true">›</span></button>`).join('')}${local.length>4?button('See Everyone Here','place-open','','ghost small'):''}</section>`:''}${active?`<section class="current-lead"><h3>${e(active.title)}</h3><p>${e(active.objective)}</p>${button('Review the undertaking','tab','quests','ghost small')}</section>`:''}</aside>`;
}

function dungeonScene(overview=false) {
  const d=dungeonView(game);if(!d)return '';
  return `<section class="panel dungeon-panel"><div class="eyebrow">AN EXPEDITION, ROOM BY ROOM</div><h2>${e(d.title)}</h2><p>${e(d.description)}</p>${d.objective?`<section class="expedition-purpose"><span class="eyebrow">WHAT THIS PLACE REMEMBERS</span><h3>${e(d.objective.title)}</h3><p>${e(d.objective.description)}</p><div class="badge-row"><span class="badge">${d.evidence?'Account preserved':'An account to investigate'}</span><span class="badge">${d.aid?'Practical aid completed':'Practical aid remains possible'}</span>${d.supportedBy?`<span class="badge">${e(d.supportedBy.name)} can help</span>`:''}${d.supportedTechnique?`<span class="badge">Your earned formation can help</span>`:''}</div></section>`:''}<div class="dungeon-room-grid">${d.rooms.map(r=>`<div class="dungeon-room ${r.current?'current':''} ${r.cleared?'cleared':''} ${r.visited?'visited':''}"><span>${r.cleared?'✓':r.current?'♟':'◇'}</span><strong>${e(r.title)}</strong><small>${r.current?'You are here':r.cleared?'Cleared':r.visited?'Visited':'Unexplored'}</small></div>`).join('')}</div>${overview?'':`<div class="room-story"><h3>${e(d.room?.title||'The entrance')}</h3>${paragraphs(d.room?.description||'')}</div>${actionCards(actionsForUI(game).filter(a=>a.id.startsWith('explore_')))}`}</section>`;
}

function chapter(titleText,description,eyebrow='YOUR STORY') {
  return `<header class="view-heading"><div class="eyebrow">${e(eyebrow)}</div><h1>${e(titleText)}</h1>${description?`<p>${e(description)}</p>`:''}</header>`;
}

function everydayActions() {
  return actionsForUI(game).filter(a=>!(a.id==='choose_profession'&&game.careers?.contentVersion===2)&&!/^journal_|^upbringing_|^stories_|^recovery_|^pastime_|^repertoire_|^social_|^gear_|^calling_|^talk_|^quest_|^family_|^school_|^workshop_|^lore_|^career_|^lineage_|^health_|^travel_|^life_(visit|gift|court|commit|separate|endcourt)_/.test(a.id)).map(action=>action.id==='grow_school'?{...action,label:'Join optional community lessons',description:action.description+' Formal school attendance and qualifications are recorded in School.'}:action);
}
function lifeFeed() {
  const ages=new Map();
  for(const entry of currentJournal()) {
    const list=ages.get(entry.age)||[]; list.push(entry); ages.set(entry.age,list);
  }
  const groups=[...ages];
  return `<section class="life-feed panel"><div class="feed-heading"><div><span class="eyebrow">THE RECORD OF YOUR YEARS</span><h2>${game.age<18?'A life taking shape':'The book of '+e(game.hero.name)}</h2></div>${button('Read Journal','tab','journal','ghost small')}</div><div class="life-feed-list" tabindex="0" aria-label="Your life record. Scroll to read earlier years."><ol class="age-ledgers">${groups.map(([age,entries],i)=>`<li><details class="age-ledger" ${i>=groups.length-2?'open':''}><summary><span class="age-stamp">Age ${e(age)}</span><span class="age-entry-count">${entries.length} ${entries.length===1?'entry':'entries'}</span></summary><ol class="life-entries">${entries.map(j=>`<li class="life-entry" data-day="${j.day}" data-age="${j.age}" data-kind="${e(j.tag)}"><div class="life-entry-heading"><strong>${e(j.title)}</strong><time>${e(date(j.day))}</time></div>${paragraphs(j.text)}</li>`).join('')}</ol></details></li>`).join('')}</ol></div></section>`;
}
function obligationsPanel() {
  const obligations=game.obligations.filter(o=>!o.resolved).sort((a,b)=>a.dueDay-b.dueDay).slice(0,3);
  if(!obligations.length)return '';
  return `<section class="panel life-obligations"><div class="eyebrow">PROMISES &amp; DEADLINES</div>${obligations.map(o=>`<div><strong>${e(o.title)}</strong><span class="badge ${o.missed||game.day>o.dueDay?'warning':''}">${o.missed?'Missed':game.day>o.dueDay?'Overdue':`${o.dueDay-game.day} days`}</span><p>${e(o.description)}</p></div>`).join('')}</section>`;
}
function questReturnPanel(){
  const rows=questReturnForecast(game);if(!rows.length)return '';
  const actions=actionsForUI(game),control=(row,op,label)=>{const a=actions.find(a=>a.id===`journal_${op}_story:${row.id}`);return a?button(label,'activity',a.id,'ghost small',Boolean(a.disabledReason))+(a.disabledReason?`<small class="disabled-reason">${e(a.disabledReason)}</small>`:''):'';};
  return `<details class="panel life-obligations" data-quest-return-forecast><summary>Calendar · ${rows.length} chosen ${rows.length===1?'story':'stories'}</summary><p class="small-copy">Returning chapters are invitations to revisit; they do not interrupt or accept work.</p>${rows.map(row=>`<div><strong>${e(row.title)} · ${e(row.personName)}</strong><p>${row.paused?'Paused':row.ready?'Ready to revisit':`Returns at age ${row.nextAge} · ${Math.max(0,row.dueDay-game.day)} days away`}</p><p class="small-copy">Last choice: ${e(row.lastChoice)}</p>${control(row,row.paused?'resume':'pause',row.paused?'Resume story':'Pause story')}${button('Open Journal','tab','quests','secondary small')}</div>`).join('')}</details>`;
}
function lifeHealthNotice() {
 if(!game.health||!(game.life?.health<35||game.hero.hp<game.hero.maxHp/2||game.health.physical.length||game.health.mental.length))return '';
 const v=healthView(game),names=[...v.physical,...v.mental].map(c=>c.name),local=cityRooms(game).some(r=>r.id==='shrine');
 return `<section class="panel care-support" data-life-health><span class="eyebrow">TAKE CARE OF YOURSELF</span><p><strong>Health ${v.combatHp}/${v.maxCombatHp}</strong></p><p>${names.length?e(names.join(' · ')):'You could use some rest.'}</p>${local?button('Visit the Healing Room','place-area','shrine','secondary small'):button('Find a Settlement','tab','map','secondary small')}${game.hero.potions||game.flags.herbs?button('Your Supplies','tab','inventory','ghost small'):''}</section>`;
}

/** The world, as it reaches this life: what is happening within a season's walk, what came to your door, and word from the road. */
function worldPanel(){
  const v=livingView(game); if(!v) return '';
  const home=regionAt(game,game.life?.home?.locationId||game.locationId)?.id, here=regionAt(game)?.id;
  const near=v.events.filter(ev=>ev.routed||[home,here].includes(game.living.events.find(e=>e.id===ev.id)?.regionId)).slice(0,4);
  const threads=v.threads.filter(t=>t.memory.length).slice(-3);
  const news=v.news.filter(n=>!near.some(ev=>ev.id===n.eventId)).slice(-3);
  if(!near.length&&!threads.length&&!news.length) return '';
  return `<section class="panel world-panel" data-world-panel><div class="section-heading"><h2>The world</h2><span class="eyebrow">${e(near.length?'WITHIN A SEASON’S WALK':'WORD FROM THE ROAD')}</span></div>${near.map(ev=>`<p class="world-event"><strong>${e(ev.region)}</strong> · ${e(ev.text)}${ev.seasonsLeft>1?` <small>${ev.seasonsLeft} seasons more, they say.</small>`:''}</p>`).join('')}${threads.length?`<div class="world-threads">${threads.map(t=>`<p class="small-copy">${e(t.memory.at(-1))}${t.waiting?' <em>You will hear more.</em>':''}</p>`).join('')}</div>`:''}${news.length?`<details class="world-news"><summary>Word from the road</summary>${news.map(n=>`<p class="small-copy">${e(n.text)}${n.seasonsAgo>0?` <small>${n.seasonsAgo===1?'Last season.':n.seasonsAgo+' seasons ago.'}</small>`:''}</p>`).join('')}</details>`:''}</section>`;
}
function lifeView() {
  if(game.battle)return battleView();
  if(game.delve||game.maze||game.dungeon||game.rpg?.expedition||game.adventuring?.expedition)return currentDungeonView();
  if(!game.event&&game.phase!=='retired'&&game.justice?.prison)return realmPage(game,actionsForUI(game),uiHelpers());
  if(!game.event&&game.phase!=='retired'&&game.adventuring?.expedition)return adventurePage(game,actionsForUI(game),{...uiHelpers(),section:'delves'});
  if(game.phase==='retired')return `${chapter('The final leaf','Your choices have become a story.','YOUR EPILOGUE')}<section class="panel chronicle">${paragraphs(game.chronicle)}${button('Continue the family story','tab','legacy','primary')}${button('Read Journal','tab','journal','secondary')}${button('Begin another life','new','','primary')}</section>${renderLatestExpeditionReceipt(game,uiHelpers())}`;
  const c=campaignView(game), pending=game.conversations?.pending;
  const roadActions=actionsForUI(game).filter(a=>!game.timeline?.journey&&a.id==='grow_continue_journey'||a.id.startsWith('travel_')&&(!game.timeline?.journey||a.id!=='travel_continue_response')||['atlas_continue','atlas_cancel'].includes(a.id)||game.cartography?.pending&&a.id==='feed_vampire');
  const current=game.event?`${game.dungeon?dungeonScene(true):''}${eventScene()}`:game.dungeon?dungeonScene():pending?renderConversationPanel(game,pending.personId,uiHelpers()):'';
  const calm=!current&&!game.workshop?.project&&!game.careers?.batch&&!getLifeCommitment(game)&&!roadActions.length?`<header class="daily-record"><span class="eyebrow">TODAY</span><h2>${e(date())}</h2><p>${e(game.cartography?.offsite?'On the Road':location()?.name)}${game.hero.profession!=='Unemployed'?' · '+e(roleTitle(game.hero.profession)):''}</p></header>`:'';
  const ui=uiHelpers(),road=roadActions.length?`<section class="panel journey-panel"><h2>Your journey continues</h2>${actionCards(roadActions)}</section>`:'';
  const suspendedCard=game.adultTournament?.stage==='paused'&&!current?renderTournamentCard(game,ui,actionsForUI(game),{potionReason:consumableReason(game,'potions')}):'';
 const plans=suspendedCard+projectPanel()+careerPlanPanel()+ongoingActivityPanel()+road+savedYearPanel()+obligationsPanel()+questReturnPanel();
  const farmer=farmView(game);
  if(ui.section==='years')return farmer?renderFarmerBook(game,farmer,ui):lifeFeed();
  if(ui.section==='plans')return routinePlannerPanel()+plans+renderLifeContext(game,actionsForUI(game),ui)+(game.age>=18?householdBudgetPanel(game,ui):'')+(game.age>=16?renderEconomyPlan(game,ui,{goal:economyGoal}):'')+(game.age>=18?`<details class="home-disclosure" data-disclosure="community-works"><summary>Community works</summary>${communityPanel(game,ui)}</details>`:'');
  if(farmer&&farmerDayVisible(game)&&ui.section==='present'){
    const farmUi={...ui,personPortrait:person=>{const actor=game.life.people.find(p=>p.id===person.id)||game.life.children.find(p=>p.id===person.id)||game.society?.people?.find(p=>p.id===person.id)||game.society?.archive?.find(p=>p.id===person.id);return actor?renderAvatar(actor,{size:'small',age:actor.age??Math.max(0,Math.floor((game.day-actor.bornDay)/365))}):'';}};
    const continuation=journeyPanel()+(projectPanel()||careerPlanPanel()||ongoingActivityPanel()||road||savedYearPanel());
    return renderFarmerDay(game,farmer,actionsForUI(game),farmUi,{scene:current,continuation,world:worldPanel(),seasonReason:ageControlState().reason,showNumbers:displaySettings.showNumbers});
  }
  const recent=currentJournal().filter(j=>j.age===game.age).slice(-3).reverse();
  const now=!current&&!game.timeline?.journey?whatMatters(game,actionsForUI(game)):[];
  const world=worldPanel();
  const rightNow=now.length?`<section class="panel right-now" data-right-now><div class="section-heading"><h2>Right now</h2><span class="eyebrow">${e(chapterHeading(game.age))}</span></div>${actionCards(now.map(a=>({...a,description:a.why,detail:a.detail||a.description})))}<p class="small-copy">${button('Everything else','tab','activities','ghost small')}</p></section>`:'';
  return `<div class="life-day-layout"><div class="life-day-story"><div class="life-current" tabindex="0" role="region" aria-label="Current moment">${journeyPanel()}${current||calm}${rightNow}${world}${!current?`<p class="life-chapter-link">${e(lifeChapterView(game).title)} · ${button('Plans &amp; household calendar','workspace-section','life:plans','ghost small')}</p>`:''}${suspendedCard}${lifeHealthNotice()}${projectPanel()||careerPlanPanel()||ongoingActivityPanel()||road}${savedYearPanel()}${obligationsPanel()}${renderLatestExpeditionReceipt(game,ui)}</div>${recent.length?`<section class="recent-moments"><div class="section-heading"><h2>This year</h2>${button('Read your years','workspace-section','life:years','ghost small')}</div>${recent.map(j=>`<article class="remembered-entry"><small>${e(date(j.day))}</small><h3>${e(j.title)}</h3>${paragraphs(j.text)}</article>`).join('')}</section>`:''}${c.ending?`<details class="panel"><summary>${e(c.ending.title)}</summary>${paragraphs(c.ending.summary)}${renderEndingLosses(game,ui)}</details>`:''}</div>${lifeMap()}</div>`;

}
function activitiesView(){return renderActivities(game,uiHelpers(),{pane:activitiesPane,ongoing:ongoingActivityPanel()});}

function actionIcon(group,id) { return /rest|clinic|potion/.test(id)?'✚':/work|purse|fine/.test(id)?'◉':/study|research|necromancy/.test(id)?'▤':/social|family/.test(id)?'♡':/expedition|train|assassin|order/.test(id)?'⚔︎':/vampire|feed/.test(id)?'☽':'✧'; }
function recentJournal() {
  const entries = game.journal.slice(-2).reverse();
  return `<section class="panel"><div class="section-heading"><h3>Threads of your story</h3>${button('Read Journal →','tab','journal','ghost small')}</div>${entries.map(j=>`<div class="journal-preview"><span class="journal-dot"></span><div><strong>${e(j.title)}</strong><p class="muted small-copy">${e(j.text)}</p></div></div>`).join('')}</section>`;
}
function preparationPanel(){const p=partyPreparation(game);return `<details class="panel"><summary>Party preparation · ${p.participants.length} ready including you · ${p.potions} draughts</summary>${p.participants.map(a=>`<p>${e(a.name)} · ${e(roleTitle(a.role))} · Health ${a.hp}/${a.maxHp} · Focus ${a.mp}/${a.maxMp}</p>`).join('')}${p.unready.map(a=>`<p>${e(a.name)} · ${e(a.reason)}</p>`).join('')}<p>${p.formationEarned?'Practiced covering formation available.':'Further formation work can earn a party covering technique.'} Match equipment and tactics to the threats you have actually discovered. Withdrawal remains available.</p></details>`;}
function romanticIdentityForm(){
 if(!game.socialLife||game.age<18)return '';
 return `<details class="romantic-identity-settings" data-disclosure="romantic-interests"><summary>Your Romantic Interests</summary><form id="romantic-identity" class="romantic-identity"><label>You Identify As<select name="gender">${[['man','Man'],['woman','Woman'],['nonbinary','Nonbinary']].map(([id,name])=>`<option value="${id}" ${game.socialLife.gender===id?'selected':''}>${name}</option>`).join('')}</select></label><label>Interested In<select name="attraction">${[['any','People of Any Gender'],['men','Men'],['women','Women'],['none','I Don’t Want Romance']].map(([id,name])=>`<option value="${id}" ${game.socialLife.attraction===id?'selected':''}>${name}</option>`).join('')}</select></label><button class="button secondary small" type="submit">Keep These Choices</button></form></details>`;
}
function characterBaseView() {
  const h=game.hero, classes=classView(game), actions=actionsForUI(game), training=combatTrainingView(game);
  const callingCard=c=>{const a=actions.find(a=>a.id===c.actionId);const related=actions.filter(a=>a.id===`calling_meet_${c.id}`||a.id===`calling_train_${c.id}`||a.id===`calling_switch_${c.id}`);return `<article class="panel calling-card ${c.active?'active':''}"><div class="badge-row"><span class="badge">${e(title(c.role))}</span>${c.active?'<span class="badge">Your calling</span>':c.learned?'<span class="badge">Learned</span>':''}</div><h3>${e(c.name)}</h3><p>${e(c.description)}</p><p class="calling-ability">${e(c.ability)}</p><div class="calling-requirements">${c.requirements.map(r=>`<span class="${r.met?'met':''}">${e(title(r.skill))} ${r.current}/${r.required}</span>`).join('')}<span>Age ${c.minAge}+</span></div><p class="mentor-detail">${e(c.mentor?.name||'A teacher')} · ${e(game.world.locations.find(p=>p.id===c.locationId)?.name||title(c.locationId))}</p>${button('Find '+e(c.mentor?.name||'your mentor')+' on map','quest-location',c.locationId,'secondary small')}${c.learned?related.filter(a=>a.id.startsWith('calling_switch_')).map(a=>offeredButton(a.id,a.label,'secondary small')).join(''):''}</article>`;};
  const callingGroups=[['warrior','Shield & steel'],['mage','Spells & mysteries'],['rogue','Wits & wilderness']].map(([role,label])=>{
    const options=classes.callings.filter(c=>c.role===role&&(c.mentor.met||c.learned));
    return `<details class="calling-group construction-section" data-disclosure="calling-${role}" ${classes.active?.role===role?'open':''}><summary><span>${e(label)}<small>${e(options.map(c=>c.name).join(' · '))}</small></span><span class="badge">${options.length}</span></summary><div class="calling-grid">${options.map(callingCard).join('')||'<p class="small-copy">No teacher in this group has been met. Explore inhabited places and speak with mentors; meeting someone reveals their actual lessons and requirements.</p>'}</div></details>`;
  }).join('');
  return chapter(h.name,'Your identity, learned abilities and the path you choose.','CHARACTER')+selectSection(uiHelpers(),{overview:`<section class="panel"><div class="avatar-builder"><div class="avatar-preview"><div class="portrait-stage">${renderAvatar(h,{size:'hero',age:game.age})}</div>${button(portraitSelectionReason(game)?'Portrait status':'Choose portrait','portraits','','secondary small')}${button('Character attributes','customize','','ghost small')}</div><div class="fact-list">${[['Age',`${game.age} · ${getLifeStage(game)}`],['Origin',h.lifeOrigin?`${originById(h.lifeOrigin.id)?.label||'Unknown origin'} · entered at ${h.lifeOrigin.startingAge}`:`${game.world.locations.find(p=>p.id===h.birthplaceId)?.name||names[h.origin]} · ${names[h.household]}`],...(h.station?[['Station',`${h.station.rank[0].toUpperCase()}${h.station.rank.slice(1)}${h.station.freedom==='owned'?' · owned':h.station.freedom==='bound'?' · bound to the land':''}${h.station.literate?'':' · no one at home reads'}`]]:[]),...(schoolingView(game)?[['Letters',(v=>v.literate?`Can read${v.letters==='tutor'?' · taught by a tutor':v.letters==='home'?' · taught at the family table':v.letters==='school'?' · schooled':v.letters==='self'?' · learned as a grown person':''}${v.credentials.filter(c=>c.kind!=='journeyman').length?' · '+v.credentials.filter(c=>c.kind!=='journeyman').map(c=>c.label).join(', '):v.tier>=2?' · grammar school certificate':v.tier===1?' · a school certificate':''}${v.credentials.some(c=>c.kind==='journeyman')?' · journeyman '+v.credentials.find(c=>c.kind==='journeyman').major:''}${v.electives.filter(e=>e.grade!==null).length?' · '+v.electives.filter(e=>e.grade!==null).map(e=>e.label).join(', '):''}`:'Cannot read')(schoolingView(game))]]:[]),['Heritage',effectiveHeritage(h).name],['Birthplace',game.world.locations.find(p=>p.id===h.birthplaceId)?.name||'Unknown birthplace'],...(h.lifeOrigin?[['Birth community',originById(h.lifeOrigin.id)?.communityName||'Unknown community']]:[]),['Identity',`${pronounDisplayLabel(h.pronouns)} · ${title(h.temperament)} · ${title(h.belief)}`],['Calling',classes.active?.name||(h.path==='unformed'?'Still discovering':'Trained '+title(h.path))],['Livelihood',`${careerView(game).progress.masteryLabel} · ${h.profession}`],['Health',`${h.hp}/${h.maxHp}`],['Bodily wellbeing',`${game.life.health}/100`],['Home',title(game.life.home.tier)],['Appearance',describeAppearance({...h,age:game.age,appearance:appearanceAtAge(h.appearance,game.age)})],['Condition',h.condition?title(h.condition.type):'Mortal']].map(([k,v])=>`<div class="fact-item"><span>${e(k)}</span><strong>${e(v)}</strong></div>`).join('')}</div></div></section>`,training:`<section class="panel"><div class="section-heading"><h2>Abilities taking shape</h2><span class="badge">Level ${h.level}</span></div><div class="attribute-grid">${Object.entries(h.attributes).map(([key,v])=>`<div class="attribute"><span>${title(key)}</span><strong>${v}</strong><small>Combat ${e(Number(training.actor.attributes[key]).toFixed(1))}</small></div>`).join('')}</div><div class="skill-grid">${Object.entries(h.skills).map(([key,v])=>`<div class="skill-item"><span>${title(key)}</span><strong>${v}</strong><small>Combat ${e(training.rows.find(r=>r.id===key).effective.toFixed(1))}</small><div class="meter"><div class="meter-fill" style="width:${Math.min(100,v*8)}%"></div></div></div>`).join('')}</div><details class="combat-training" data-combat-training><summary>How life training becomes combat power</summary><p>${e(training.explanation)}</p><p>Weapon attack ${e(training.attack)} · Arcane power ${e(training.arcane)} · Armor ${e(training.armor)}. Abilities add their stated effects; target armor, wards and resistance affect the final hit.</p>${training.rows.map(r=>`<p class="small-copy"><strong>${e(title(r.id))}</strong> ${r.raw} in life → ${e(r.effective.toFixed(1))} in combat. ${e(r.use)}</p>`).join('')}</details></section>`,personality:`${renderPersonalityPanel(game)}${h.upbringing?`<details class="panel"><summary>The upbringing you carry</summary><p>These are your own recorded childhood practices. Personality traits remain your choice within your current age budget.</p>${Object.entries(h.upbringing.traits).map(([k,n])=>`<span class="badge">${e(k)} ${n}</span>`).join('')}${h.upbringing.history.slice(-4).map(v=>`<p class="small-copy">${e(v.text)}</p>`).join('')}</details>`:''}${preferencesPanel()}${romanticIdentityForm()}`,callings:`<section><div class="section-heading"><h2>Your Callings</h2><span class="muted">Meet teachers in the world to learn new callings.</span></div>${callingGroups}</section>`,condition:conditionPanel()||'<section class="panel"><h2>A mortal life</h2><p>No major supernatural condition is active. Rare meetings can be discovered through lived time; none is promised here.</p></section>'});
}

function partyBaseView() {
  const count=game.companions.filter(c=>c.recruited&&c.active).length,localPeople=new Set(nearbyContacts(game).map(p=>p.id)),rememberedPeople=new Set(rememberedContacts(game).map(p=>p.id)),availablePeople=new Set(getContacts(game).map(p=>p.id));
  return `${chapter('People, not equipment.','Your companions have goals, principles, and memories of the life you share.','YOUR PARTY')}<div class="section-heading"><h2>Companions</h2><span class="badge">${count} / 3 active</span></div><p class="small-copy">Up to three companions travel with you. Others remain in your circle as reserves; free an active slot here before inviting a reserve to travel.</p>${!game.companions.some(c=>c.recruited)?`<section class="panel"><h3>Company begins with a meeting</h3><p>Meet a possible companion in the world, speak with them, and follow their actual invitation. Your ready count includes you.</p>${button('Look around this settlement','place-open','','secondary')}${button('Read people you have met','tab','relationships','ghost')}</section>`:''}<div class="companion-grid">${game.companions.filter(c=>c.recruited).map(c=>{const combat=companionCombatProfile(game,c);return `<article class="panel companion-card"><div class="companion-heading">${avatar(c)}<div><h3>${e(c.name)}</h3><p class="muted">${e(title(companionRole(c)))}${Number.isFinite(c.age)?` · Age ${c.age}`:''}</p></div><span class="badge">${e(combat.readiness.label)}</span></div><p>${e(c.goal)}</p><div class="companion-value"><span class="eyebrow">WHAT MATTERS TO THEM</span><p class="muted small-copy">${e(Array.isArray(c.values)?c.values.join(' · '):c.values)}</p></div><div class="stat-row"><span>Your relationship</span><strong>${relationship(c.relationship)} <span class="muted">(${c.relationship})</span></strong></div>${renderCompanionCombatProfile(game,c,{readinessReason:personalReadiness(game,c.id)||(c.id==='mira'&&game.flags?.miraWithdrawn?`${c.name} refuses active travel after the unwilling binding.`:null)})}${renderFieldPotionTreatment(fieldPotionQuote(game,c.id),uiHelpers())}${c.memories?.length?`<div class="memory-list"><span class="eyebrow">THEY REMEMBER</span>${c.memories.slice(-3).map(m=>`<p>“${e(typeof m==='string'?m:m.text || m.description)}”</p>`).join('')}</div>`:'<p class="muted small-copy">Shared moments will become memories.</p>'}${button(localPeople.has(c.id)?'Speak in this settlement':rememberedPeople.has(c.id)?'Read relationship record':'Find their recorded place',localPeople.has(c.id)||rememberedPeople.has(c.id)?'show-contact':'person-place',c.id,'ghost small',!rememberedPeople.has(c.id)&&!availablePeople.has(c.id))}${button(c.recruited?(c.active?'Move to reserves':'Invite to active party'):(count<3&&!personalReadiness(game,c.id)?'Join the active party':'Join the circle in reserve'),c.recruited?'toggle-companion':'recruit',c.id,'secondary',!!companionActionReason(game,c.id,c.recruited?'toggle':'recruit'))}${companionActionReason(game,c.id,c.recruited?'toggle':'recruit')?`<p class="disabled-reason">${e(companionActionReason(game,c.id,c.recruited?'toggle':'recruit'))}</p>`:''}</article>`;}).join('')}</div>${game.event?'<p class="muted">Finish the current event before changing your party.</p>':''}`;
}
function relationship(n) { return n>=70?'Devoted':n>=40?'Trusted':n>=15?'Friendly':n>=0?'Acquainted':n>=-25?'Strained':'Hostile'; }

function questsBaseView() {
  const c=campaignView(game), actions=actionsForUI(game), active=c.quests.filter(q=>q.status==='active'), others=c.quests.filter(q=>q.status!=='active');
  const card=q=>{const available=actions.filter(a=>a.id===`quest_begin_${q.id}`||a.id===`quest_side_${q.id}`||a.questId===q.id);return `<article class="panel quest-card ${e(q.status)}"><div class="quest-status"><span class="badge">${e(title(q.status))}</span>${q.locationId?`<span>⌖ ${e(game.world.locations.find(p=>p.id===q.locationId)?.name||title(q.locationId))}</span>`:''}</div><h3>${e(q.title)}</h3><p>${e(q.description)}</p><div class="quest-objective">${e(q.objective)}</div><div class="quest-buttons">${available.map(a=>button(e(a.label),'activity',a.id,'primary',!!a.disabledReason)).join('')}${q.locationId?button('Show on map','quest-location',q.locationId,'secondary small'):''}</div>${available.filter(a=>a.disabledReason).map(a=>`<p class="disabled-reason">${e(a.disabledReason)}</p>`).join('')}</article>`;};
  return `${chapter(c.title,c.ending?'Your investigation has ended. Its consequences remain part of your ongoing life.':c.summary,c.actLabel)}<section class="panel fate-summary"><span class="eyebrow">${game.campaign?.facts?.inheritedResolution?'A FAMILY HISTORY':'YOUR BIRTH OMEN'}</span><h2>${e(c.fateLabel)}</h2><p>${game.campaign?.facts?.inheritedResolution?'Earlier choices changed this region. Your own life can add to what comes next.':'A beginning, not an ending. What you do with it belongs to you.'}</p></section>${c.ending?`<section class="panel campaign-ending"><h2>${e(c.ending.title)}</h2>${paragraphs(c.ending.summary)}${renderEndingLosses(game,uiHelpers())}</section>`:''}<div class="section-heading"><h2>${game.age<16?'Signs along the way':'Leads to follow'}</h2><span class="badge">${active.length} active</span></div><div class="quest-grid">${active.map(card).join('')||`<section class="panel"><p>${c.ending?'These chapters are complete. Return to Life to continue with the people and places you changed.':game.age<16?'Your childhood holds the first clues. The larger investigation opens as you grow older.':'Your investigation is paused. You can return to it when you are ready.'}</p></section>`}</div>${actions.filter(a=>a.id.startsWith('quest_')&&!c.quests.some(q=>a.id===`quest_begin_${q.id}`||a.id===`quest_side_${q.id}`||a.questId===q.id)).length?activitiesPanel(actions.filter(a=>a.id.startsWith('quest_')&&!c.quests.some(q=>a.id===`quest_begin_${q.id}`||a.id===`quest_side_${q.id}`||a.questId===q.id))):''}<details class="quest-history" data-disclosure="other-quests"><summary>Other chapters &amp; outcomes (${others.length})</summary><div class="quest-grid">${others.map(card).join('')}</div></details>`;
}

function inventoryView(){return renderPackWorkspace(game,uiHelpers(),{filter:gearFilter,category:inventoryCategory,query:inventoryQuery,sort:inventorySort,selectedId:inventoryItem,favoritesOnly:inventoryFavoritesOnly,presetId:selectedGearPreset});}
function travelPlanPanel(){return renderRoadPlanPanel(game,uiHelpers());}
function journeyPanel(){return renderRoadJourney(game,uiHelpers());}

function mapBaseView() {
  const selected=game.world.locations.find(p=>p.id===selectedLocation)||location();
  const preview=game.travel?travelPlanPreview(game,selected.id):travelPreview(game,selected.id), c=campaignView(game), weather=worldCalendarContext(game.world,game.day,game.seed);
  const localQuests=c.quests.filter(q=>q.locationId===selected.id&&q.status==='active');
  return `${chapter(game.world.name,`${weather.season} · ${weather.weather}. ${weather.pressure}`,'THE WORLD')}<div class="world-layout"><section class="world-map-panel panel">${renderWorldMap(game,{selectedId:selected.id,movement,quests:c.quests})}</section><aside class="panel map-inspector"><div class="eyebrow">${e(title(selected.type))}</div><h2>${e(selected.name)}</h2><span class="badge ${selected.status==='destroyed'?'warning':''}">${e(title(selected.status||'thriving'))}</span>${paragraphs(currentPlaceDescription(game,selected))}<details class="map-name-lore"><summary>Names and memories of this region</summary><p>${e(regionalNamingLore(regionAt(game,selected.id)?.id||game.world.environment?.profileId).cultureRule)}</p><p>${e(regionalNamingLore(regionAt(game,selected.id)?.id||game.world.environment?.profileId).remembrance)}</p></details>${selected.id!==game.locationId?`<div class="route-preview"><div class="travel-metrics"><div><span>Travel days</span><strong>${preview.days}</strong></div><div><span>Departure</span><strong>${preview.cost||0}g</strong></div><div><span>Highest danger</span><strong>${preview.risk??'—'}${preview.risk!==undefined?'%':''}</strong></div></div><p>${e(preview.description)}</p>${livingCosts(preview.days)}${preview.precautions?`<ul>${preview.precautions.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:''}${preview.disabledReason?`<p class="disabled-reason">${e(preview.disabledReason)}</p>`:''}${button('Travel here →','travel',selected.id,'primary',!!preview.disabledReason)}</div>`:'<span class="badge">You are here</span>'}${localQuests.length?`<div class="location-leads"><h3>Stories here</h3>${localQuests.map(q=>`<p><strong>${e(q.title)}</strong><br>${e(q.objective)}</p>`).join('')}${button('Open quests','tab','quests','secondary small')}</div>`:''}${selected.id===game.locationId&&!game.event&&!game.battle?activitiesPanel(actionsForUI(game).filter(a=>a.id.startsWith('explore_'))):''}</aside></div>${journeyPanel()}${travelPlanPanel()}${game.world.changes?.length?`<section class="panel world-changes"><h2>The world remembers</h2>${game.world.changes.slice(-5).reverse().map(c=>`<article><h3>${e(c.title)}</h3>${paragraphs(c.text)}</article>`).join('')}</section>`:''}`;
}

function personalNoteScope(){return JSON.stringify([activeSlot,game?.seed,game?.timeline?.birthDay,personalNoteOwner(game)]);}
function resetJournalSession(){journalCategory='all';journalQuery='';journalPages={};personalNotesScope='current';pendingPersonalNote=null;journalScope=personalNoteScope();}
function journalView(){
 if(journalScope!==personalNoteScope())resetJournalSession();
 const ui=uiHelpers(),farmer=farmView(game),shelves=()=>renderSimpleJournal(game,actionsForUI(game),ui,{query:journalQuery,pages:journalPages,personalScope:personalNotesScope,noteDraft:personalNoteDrafts.get(personalNoteScope()),category:journalCategory});
 if(farmer)return renderFarmerBook(game,farmer,ui)+`<details class="farm-errands" data-disclosure="farm-errands" ${ui.section!=='active'?'open':''}><summary>Errands</summary>${renderWorkspaceNavigation('journal',workspaceSections.journal,ui)}${shelves()}</details>`;
 return shelves();
}
function refreshNoteDraft(scope,{focus=false}={}) {
 if(scope!==personalNoteScope()||screen!=='game'||tab!=='journal'||workspaceSection('journal',workspaceSections.journal)!=='notes'||modal)return;
 render();if(focus)focusControl(null,null,'#note-text');
}
function keepPersonalDraft(text) {
 const scope=personalNoteScope();personalNoteDrafts.write(scope,text);
 const draft=personalNoteDrafts.get(scope),token=personalNoteDrafts.begin(scope);if(!token)return;
 const finish=success=>{if(personalNoteDrafts.finish(scope,token,success)){journalPages.personal=0;refreshNoteDraft(scope,{focus:true});}};
 if(draft.receipt){
  const prior=personalNoteRows(game).find(n=>n.own&&n.key===draft.receipt.key&&n.text===draft.receipt.text);
  if(!prior){finish(false);toast('The previously submitted note changed. Your draft is retained; review your personal notes before saving it again.');return;}
  refreshNoteDraft(scope);
  if(draft.text.trim()!==prior.text){
   const review=reviewPersonalNote(game,prior.key),next=editPlayerNote(game,review,draft.text.trim());
   const changed=personalNoteRows(next).find(n=>n.own&&n.key===prior.key&&n.text===draft.text.trim());
   if(!changed){finish(false);return;}
   const result=update(next,undefined,{afterAdopt:()=>personalNoteDrafts.adopted(scope,token,{key:changed.key,text:changed.text}),afterPersist:finish});
   if(!result)finish(false);else if(result?.then)result.then(()=>{if(personalNoteDrafts.get(scope).token===token&&personalNoteDrafts.get(scope).saving)finish(false);},()=>finish(false));
  }else Promise.resolve(save()).then(value=>finish(value===true),()=>finish(false));
  return;
 }
 const next=keepPlayerNote(game,text),known=new Set(personalNoteRows(game).map(n=>n.key));
 const added=personalNoteRows(next).find(n=>n.own&&!known.has(n.key));
 if(!added){finish(false);toast(next.notice||'Write a note before keeping it.');return;}
 refreshNoteDraft(scope);
 const result=update(next,undefined,{afterAdopt:()=>personalNoteDrafts.adopted(scope,token,{key:added.key,text:added.text}),afterPersist:finish});
 if(!result)finish(false);
 else if(result?.then)result.then(()=>{if(personalNoteDrafts.get(scope).token===token&&personalNoteDrafts.get(scope).saving)finish(false);},()=>finish(false));
}
function writePersonalNote() {
 const scope=personalNoteScope(),workspace=root.querySelector('.workspace-body');
 noteReturnPositions.set(scope,{top:workspace?.scrollTop||0,left:workspace?.scrollLeft||0,windowY:window.scrollY||0});
 personalNotesScope='current';journalPages.personal=0;render();
 afterCurrentRender(()=>{const field=root.querySelector('#note-text');field?.scrollIntoView?.({block:'center'});field?.focus();const caret=personalNoteDrafts.get(scope).selection;if(field)field.setSelectionRange?.(caret?.start??field.value.length,caret?.end??field.value.length,caret?.direction||'none');});
}
function returnToDiscoveries() {
 const position=noteReturnPositions.get(personalNoteScope()),workspace=root.querySelector('.workspace-body');
 root.querySelector('[data-op="personal-note-write"]')?.focus({preventScroll:true});
 if(position){if(workspace){workspace.scrollTop=position.top;workspace.scrollLeft=position.left;}window.scrollTo({top:position.windowY,behavior:'instant'});}
 else root.querySelector('#journal-discoveries-heading')?.scrollIntoView?.({block:'start'});
}
function openHerbalCare(trigger) {
 if(!game||modal)return;
 herbalCareReview={source:game,scope:personalNoteScope(),quote:herbalCareQuote(game)};
 openModal('herbal-care',trigger);
}
function finishPersonalNote(text){
 const pending=pendingPersonalNote,fresh=pending&&reviewPersonalNote(game,pending.note.key);
 if(!pending||modal!=='personal-note'||pending.scope!==personalNoteScope()||JSON.stringify(fresh)!==JSON.stringify(pending.review)){if(modal==='personal-note')closeModal();toast('This note or life changed. Nothing was overwritten; reopen the note to review it.');return;}
 if(pending.mode==='edit'&&(typeof text!=='string'||!text.trim()||text.length>2000)){toast('Write between 1 and 2000 characters before saving.');return;}
 if(pending.mode==='edit'&&text===pending.note.text){closeModal();toast('Your note is unchanged.');return;}
 const next=pending.mode==='edit'?editPlayerNote(game,pending.review,text):archivePlayerNote(game,pending.review,!pending.note.archived);
 update(next,undefined,{afterAdopt:()=>{pendingPersonalNote=null;modal=null;focusReturn=null;render();focusControl('personal-note-edit',pending.note.key,'#personal-notes-heading');}});
}

function practiceContext(){return {life:game,position:game?JSON.stringify(game):'',slot:activeSlot,screen,tab,modal,view:JSON.stringify(workspaceSettings())};}
function practiceProtection(context){
  // protect() is pending while this authorized synchronous check runs.
  if(practiceProtectionScope&&context.life===practiceProtectionScope)return {ready:true};
  if(ironmanFenced()||isIronman(context.life))return {ready:false,reason:'Confirm the Ironman position before practice.'};
  if(!context.life)return {ready:true};
  saveStore.checkForConflict(context.slot);
  const dirty=saveStore.hasUnsavedChanges(context.slot,context.life);
  const health=slotSaveHealth(context.slot,true);
  const ready=!dirty&&storageAvailable&&health.available&&health.hasDurableState&&!health.hasChanges&&health.status==='saved';
  return {ready,reason:'Saving needs attention before practice can open safely. Review the browser save status and export your latest session if needed. Your life has not changed.'};
}
function practiceModel(state=practiceController.current()){
  return buildBattleReadModel(state.practice.battle,{selectedEnemy:state.selectedEnemy,selectedAlly:state.selectedAlly,commandsEnabled:state.practice.status==='active'});
}
function practiceButton(label,op,id='',state=practiceController.current(),cls='secondary'){
  return `<button class="button ${cls}" type="button" data-op="${e(op)}" data-id="${e(id)}" data-practice-session="${e(state.id)}">${e(label)}</button>`;
}
function focusPractice(selector='.practice-heading'){
  queueMicrotask(()=>afterCurrentRender(()=>root.querySelector(selector)?.focus({preventScroll:selector!=='.practice-heading'})));
}
async function openPractice(lessonId,target){
  if(!TACTICS_LESSONS.some(l=>l.id===lessonId))return;
  const returnData={modal,focusReturn:focusReturn?{...focusReturn}:null,op:target.dataset.op,id:target.dataset.id};
  target.disabled=true;
  const result=await practiceController.open(lessonId,{stillCurrent:()=>target.isConnected,returnData});
  if(target.isConnected)target.disabled=false;
  if(result.status==='opened'&&practiceController.current()?.id!==result.id)return;
  if(result.status==='opened'){modal='practice';render();focusPractice();announceView('Tactics rehearsal. Practice only; your life is unchanged.');}
  else if(result.status==='blocked'){
    if(activeSaveConflict())openModal('save-conflict',target);
    else{reflectStorageWarning();toast(result.reason);announceView(result.reason);}
  }
}
function closePractice(token){
  const previous=practiceController.close(token);if(!previous)return;
  modal=previous.returnData?.modal||null;focusReturn=previous.returnData?.focusReturn||null;
  render();
  queueMicrotask(()=>afterCurrentRender(()=>{
    const control=[...root.querySelectorAll('[data-op]')].find(el=>el.dataset.op===previous.returnData?.op&&el.dataset.id===previous.returnData?.id&&el.getClientRects().length);
    (control||root.querySelector('.modal-close,#main-content h1,.title-menu-item'))?.focus({preventScroll:true});
  }));
}
function handlePracticeClick(target,op,id){
  const state=practiceController.current();if(!state)return false;
  if(modal!=='practice'||target.dataset.practiceSession!==state.id)return true;
  if(op==='practice-close'){closePractice(state.id);return true;}
  if(op==='practice-lesson'||op==='practice-retry'){
    const lessonId=op==='practice-retry'?state.practice.lessonId:id;
    if(!TACTICS_LESSONS.some(l=>l.id===lessonId))return true;
    practiceController.lesson(state.id,lessonId);render();focusPractice();return true;
  }
  if(op==='practice-action'){
    const model=practiceModel(state),action=model.actions.find(a=>a.id===id);
    if(!action||action.disabledReason||state.practice.status!=='active')return true;
    const targetId=action.targetSide==='party'?model.selectedAlly:model.selectedEnemy;
    practiceController.act(state.id,id,targetId);const next=practiceController.current();render();
    if(next.practice.status==='active')focusPractice(`[data-practice-session="${next.id}"][data-op="practice-action"][data-id="${id}"]:not(:disabled)`);
    else focusPractice('.practice-status');
    announceView(next.practice.feedback);return true;
  }
  return true;
}
function practiceDialog(){
  const state=practiceController.current();if(!state)return '';
  const lesson=TACTICS_LESSONS.find(l=>l.id===state.practice.lessonId),model=practiceModel(state);
  const controls=practiceButton('Retry this lesson','practice-retry')+practiceButton('Leave practice','practice-close');
  const status=`<div class="practice-status" tabindex="-1" role="status"><strong>${state.practice.status==='completed'?'Lesson completed.':state.practice.status==='ended'?'Practice ended.':'Your objective'}</strong><p>${e(state.practice.feedback)}</p></div>`;
  // The resolver's final line narrates a real encounter returning to life.
  // Replace only that terminal narration for this explicitly fictional view.
  const logLines=state.practice.battle.outcome?[...state.practice.battle.log.slice(0,-1),'Practice ended. No life resources or progress change.']:state.practice.battle.log;
  const content=renderBattleWorkspace(model,{...uiHelpers(),chapter:(name,description,label)=>`<span class="eyebrow">${e(label)}</span><h3>${e(name)}</h3><p>${e(description)}</p>`},{
    actionOp:'practice-action',sessionId:state.id,idPrefix:state.id,enemyTargetName:state.id+'-enemy-target',allyTargetName:state.id+'-ally-target',
    portraitFor:a=>`<span class="practice-actor-emblem" aria-hidden="true">${a.id==='hero'?'◆':'◇'}</span>`,
    outcomeContent:status+`<div class="practice-controls">${controls}</div>`,eyebrow:'PRACTICE ONLY',fieldLabel:'Practice combatants and targets',commandsLabel:'Practice battle commands',
    allySelectedLabel:'Support target',allyTargetLabel:'Choose this ally',logLines,
  });
  return `<div class="modal-overlay"><section class="modal practice-modal" role="dialog" aria-modal="true" aria-labelledby="practice-title" aria-describedby="practice-notice" data-practice-session="${e(state.id)}"><button class="modal-close button ghost" type="button" data-op="practice-close" data-practice-session="${e(state.id)}" aria-label="Leave tactics practice">×</button><h2 id="practice-title" class="practice-heading" tabindex="-1">Tactics rehearsal</h2><p id="practice-notice" class="practice-notice">${e(TACTICS_PRACTICE_NOTICE)}</p><nav class="practice-lessons" aria-label="Practice lessons">${TACTICS_LESSONS.map(l=>`<button class="button ${l.id===lesson.id?'active':'secondary'}" type="button" data-op="practice-lesson" data-id="${e(l.id)}" data-practice-session="${e(state.id)}" aria-pressed="${l.id===lesson.id}">${e(l.title)}</button>`).join('')}</nav><h3>${e(lesson.title)}</h3>${state.practice.status==='active'?status+`<details class="practice-hint"><summary>Show a hint</summary><p>${e(lesson.hint)}</p></details><div class="practice-controls">${controls}</div>`:''}${content}</section></div>`;
}
function battleView() {
  const captured=game.battle,namedTargetId=battleNamedTargetId(game,captured);
  const b=namedTargetId?{...captured,namedTargetId}:captured;
  const model=buildBattleReadModel(b,{selectedEnemy:selectedTarget,selectedAlly:selectedAllyTarget,outlookEnabled:!isTournamentBattle(b)});
  selectedTarget=model.selectedEnemy;selectedAllyTarget=model.selectedAlly;
  const outcomeContent=isTournamentBattle(b)&&b.outcome?`<div class="eyebrow">SUPERVISED LOCAL BOUT</div><h2>${b.outcome==='victory'?'The marshal calls your win.':b.outcome==='defeat'?'A loss, not a life ended.':'You chose to stop.'}</h2><p>Both entrants leave the bout alive. Your actual Focus and carried potion use persist. ${b.outcome==='defeat'?'Return with at least 1 Health; normal care remains your choice.':'Remaining Health carries back.'} No recovery day, fine, experience or equipment is added. The posted purse is only for the completed three-win card.</p>${button('Record This Bout','battle-finish','','primary')}`:b.outcome?`<div class="eyebrow">${e(title(b.outcome))}</div><h2>${b.outcome==='victory'?'Victory.':b.outcome==='retreat'?'You live to choose another day.':'A chance to recover.'}</h2><p>${b.outcome==='victory'?`Your party earns ${b.rewards.gold} gold and ${b.rewards.exp} experience.`:b.outcome==='retreat'?'Your remaining health and spent supplies carry forward.':`${b.context?.kind==='curse'?'The hunt leaves you at 10% health.':`Recovery takes 3 days and ${Math.min(game.hero.gold,Math.max(4,Math.floor(game.hero.gold*.15)))} gold.`} ${e(defeatGuidance(b))}`}</p>${button('Return to your life','battle-finish','','primary')}`:'';
  if(b.fieldVersion)return renderField(b,uiHelpers(),{selectedEnemy:selectedTarget,selectedAlly:selectedAllyTarget,outcomeContent:b.outcome?outcomeContent.replace('A chance to recover.','You come to.').replace(/Recovery takes 3 days and (\d+) gold\./,'Three days and $1 gold before you can stand. What it cost you is written when you can read it.'):'',portraitFor:a=>renderAvatar(a.id==='hero'?game.hero:game.companions.find(p=>p.id===a.id),{size:'small',age:a.id==='hero'?game.age:game.companions.find(p=>p.id===a.id)?.age||27}),commandHelpFor:(a,actor)=>actor?.id==='hero'&&personalityImpactText(game,{kind:'battle',id:a.id,specialization:game.hero.specialization})?` <span class="nature-impact">${e(personalityImpactText(game,{kind:'battle',id:a.id,specialization:game.hero.specialization}))}</span>`:''});
  return renderBattleWorkspace(model,uiHelpers(),{
    portraitFor:a=>renderAvatar(a.id==='hero'?game.hero:game.companions.find(p=>p.id===a.id),{size:'small',age:a.id==='hero'?game.age:game.companions.find(p=>p.id===a.id)?.age||27}),
    commandHelpFor:(a,actor)=>actor?.id==='hero'&&personalityImpactText(game,{kind:'battle',id:a.id,specialization:game.hero.specialization})?` <span class="nature-impact">${e(personalityImpactText(game,{kind:'battle',id:a.id,specialization:game.hero.specialization}))}</span>`:'',
    outcomeContent,
    headerContent:isTournamentBattle(b)?`<p class="small-copy" data-tournament-battle>${e(DUEL_RULES_TEXT)}</p>`:'',
  });
}
function helpModal() {
 const content=`<div class="eyebrow">HEARTH &amp; OATH</div><h2>Live a Life in the World</h2><p><strong>Life</strong> follows your current moment. ${e(AGE_UP_HELP)} Your family, work, health and discoveries shape what happens.</p><p><strong>Activities</strong> separates Everyday, Work &amp; School, Recovery, Training, Social &amp; Fun, and Crime &amp; Mischief. Work and Recovery shortcuts walk to the actual local steward or doctor. If you own a home in this settlement, Go Home and Rest spends one day in your own bed, restores all Focus and eases 8 Stress. New professions and services still come from people you meet. Social &amp; Fun includes shared afternoons, memory games and dice.</p><p><strong>Explore</strong> is your world map. Choose a named place on the map or in the destination list, review the travel time and danger, and choose <strong>Confirm Journey</strong>. Hover shows a place name; a single click selects it without travelling. <strong>Continue Journey</strong> follows a short stretch and pauses for encounters, rest or a waypoint. You can stay at a reached waypoint or stop on a country trail. Hold and drag to pan, scroll the mouse wheel to zoom at the pointer, or expand the map into its own window. Explore your current place to walk between its illustrated areas and meet people; local walking takes no days. Travel uses Focus: tired travel is slower and exhaustion can be fatal. Camp to recover Focus, Health and calm. Market camp packs provide two, five or ten sheltered nights.</p><p>Approach a person to speak. A doctor offers treatment at the Healing Room. Ask a work steward about a trade or commission, find teachers and guild mentors, or meet a contract giver at the Tavern. At the Market, ask the shopkeeper to show their goods, select both sides of a trade, and review the price.</p><p>Unspent creation Attribute Points are distributed by fate. New origins belong to your chosen ancestry. Accepted quest directions appear on your map; nearby paths are charted as you travel. Wilderness encounters depend on terrain, local danger and conflict.</p><p><strong>Relationships</strong> remembers the people you have met: Family, Lovers, Friends, Acquaintances, Rivals and Enemies. Find their recorded place when you want to see them again.</p><p><strong>Inventory</strong> keeps what you carry. Drag equipment to its matching slot, or inspect it and choose Equip. Healing potions restore up to 30 Health and consume one potion. Use medicinal herbs for care; visit a doctor for illness and injury.</p><p><strong>Journal</strong> contains Active Quests, Archive and Notes. Read an accepted task to find your next destination. Discoveries and your own reminders belong in Notes.</p><p>Activities offers walks, tavern evenings and board games. Visit real workplaces and doctors through its shortcuts. Crime &amp; Mischief uses your attributes plus a d20; a 1 fails and a 20 succeeds. Theft opens at twelve. Murder is permanent and can lead to prosecution.</p><p>New dungeons are large saved mazes: every square is a room. Click an adjoining square or focus the map and use arrow keys. Unexplored rooms hide their contents. Search caches, examine hazards, evade or fight enemies, and camp in quiet rooms. Find the objective and leave through an actual stair. Older unfinished descents retain their saved rooms and choices.</p><p>Keyboard: <strong>L</strong> Life, <strong>M</strong> Explore, <strong>P</strong> Relationships, <strong>I</strong> Inventory, <strong>J</strong> Journal. Use Tab, Enter and Space for controls, number keys for a scene reply, and Escape to close a popup. Single-key shortcuts can be disabled in Sound &amp; display. Menu contains saves, export, import and the standalone download.</p>${screen==='game'&&game&&game.phase!=='retired'?button('Find your footing','footing-open','','secondary'):''}${button('Return','close-modal','','primary')}`;
 const paragraphs=content.match(/<p>[\s\S]*?<\/p>/g)||[],labels=['Your next year','Activities & recovery','Explore & travel','Meet people & services','Character creation & discoveries','Relationships','Inventory & remedies','Journal & quests','Everyday life & crime','Dungeons','Keyboard & menus'];
 return `<div class="eyebrow">HEARTH &amp; OATH</div><h2>Live a Life in the World</h2><p>Open a topic for guidance. You can return here from Menu.</p>${paragraphs.map((copy,i)=>`<details class="help-topic"${i===0?' open':''}><summary>${labels[i]||'More guidance'}</summary>${copy}</details>`).join('')}${screen==='game'&&game&&game.phase!=='retired'?button('Find your footing','footing-open','','secondary'):''}${button('Return','close-modal','','primary')}`;
}

function customizationModal() {
  const h=game.hero;
  return `<div class="eyebrow">THE PERSON BEHIND YOUR STORY</div><h2>${e(h.name)}</h2><div class="avatar-builder"><div class="avatar-preview"><div class="portrait-stage">${renderAvatar(h,{size:'hero',age:game.age})}</div><p>${e(describeAppearance({...h,age:game.age}))}</p></div><div><p class="muted">${e(pronounDisplayLabel(h.pronouns))} · ${e(title(h.temperament))} · ${e(title(h.belief))}</p><div class="attribute-grid">${Object.entries(h.attributes).map(([key,value])=>`<div class="attribute"><span>${e(title(key))}</span><strong>${value}</strong></div>`).join('')}</div><div class="skill-grid">${Object.entries(h.skills).map(([key,value])=>`<div class="skill-item"><span>${e(title(key))}</span><strong>${value}</strong></div>`).join('')}</div></div></div><div class="modal-buttons">${button(portraitSelectionReason(game)?'Portrait status':'Choose portrait','portraits','','secondary')}${button('Skills &amp; training explained','attributes-training','','secondary')}${button('Return to the story','close-modal','','primary')}</div>`;
}

function audioSettingsPanel() {
  const a=getAudioSettings();
  return `<section class="audio-settings"><div class="drawer-section-label">THE SOUND OF THE WORLD</div><div class="audio-setting"><button class="button secondary small" type="button" data-op="music-toggle" aria-pressed="${a.musicEnabled}">♫ Music ${a.musicEnabled?'on':'off'}</button><label for="music-volume">Music volume <strong id="music-volume-label">${Math.round(a.musicVolume*100)}%</strong></label><input id="music-volume" type="range" min="0" max="1" step="0.01" value="${a.musicVolume}"></div><div class="audio-setting"><button class="button secondary small" type="button" data-op="sound-toggle" aria-pressed="${a.enabled}">Sound ${a.enabled?'on':'off'}</button><label for="ui-sound-volume">Interface volume <strong id="ui-sound-volume-label">${Math.round(a.volume*100)}%</strong></label><input id="ui-sound-volume" type="range" min="0" max="1" step="0.01" value="${a.volume}"></div></section>`;


}

function displaySettingsPanel(){return `<section class="display-settings"><div class="drawer-section-label">READING THE BOOK</div><div class="reading-presets" role="group" aria-label="Reading presets">${button('Book','reading-preset','book','secondary small')}${button('Clear reading','reading-preset','clear','secondary small')}${button('Quiet reading','reading-preset','quiet','secondary small')}</div><label for="reading-size">Text size <strong>${Math.round(displaySettings.scale*100)}%</strong></label><input id="reading-size" type="range" min="1" max="1.5" step=".1" value="${displaySettings.scale}"><label for="reading-font">Reading font</label><select id="reading-font"><option value="serif" ${displaySettings.font==='serif'?'selected':''}>Book serif</option><option value="plain" ${displaySettings.font==='plain'?'selected':''}>Plain &amp; clear</option></select><p class="reading-preview">The lantern burns beside an open book. Your next chapter is still unwritten.</p><label class="reading-shortcuts"><input id="single-key-shortcuts" type="checkbox"${displaySettings.singleKeyShortcuts?' checked':''}> Single-key navigation and numbered scene choices</label><p class="small-copy">Turn this off if these keys conflict with assistive reading controls. Tab, Enter, Space and Escape remain available.</p><label class="reading-shortcuts"><input id="reading-numbers" type="checkbox"${displaySettings.showNumbers?' checked':''}> Show the numbers behind each choice</label><label class="reading-shortcuts"><input id="reading-motion" type="checkbox"${displaySettings.reducedMotion?' checked':''}> Reduce movement</label>${button('Reset text size &amp; font','reading-reset','','ghost small')}</section>`;}
function archiveDoorReview(){const fromBackup=importFromBackup;return `<div class="eyebrow">A LIFE FOR THE ARCHIVE</div><h2>${e(pendingImport.hero.name)} belongs in the archive</h2><p>${fromBackup?'The previous life in this slot':'Incoming'}: <strong>${e(pendingImport.hero.name)}</strong> · Age ${keptAge(pendingImport)}${isIronman(pendingImport)?' · Ironman':''}.</p><div class="import-rules">${rulesMarkup(pendingImport,{compact:true})}</div><p data-archive-door>${e(fromBackup?OLD_RULES_BACKUP_DOOR:OLD_RULES_DOOR)}</p><div class="modal-buttons">${fromBackup?button('Export for the archive','export-pending','','primary'):''}${archiveLink(fromBackup?'secondary':'primary')}${button('Close','close-modal','','ghost')}</div>`;}
function importReview(){if(refusedHere(pendingImport))return archiveDoorReview();if(isIronman(pendingImport))return `<span class="eyebrow">REVIEW IRONMAN IMPORT</span><h2>${e(pendingImport.hero.name)}</h2><div class="import-rules">${rulesMarkup(pendingImport)}</div><p>Existing run authority and casualty history take precedence over this file. An unknown run requires a freshly reviewed raw-empty slot; other lives and backups are preserved.</p>${entryNotice?`<p role="status">${e(entryNotice)}</p>`:''}<div class="import-slots">${saveStore.list().map(slot=>`<label><input type="radio" name="import-slot" value="${slot.id}" ${importSlot===slot.id?'checked':''}><span>Slot ${slot.id+1} · ${slot.state?e(slot.state.hero.name):slot.kept?e(slot.kept.hero.name):'Empty'}</span></label>`).join('')}</div>${button('Import into reviewed empty slot','confirm-import','','primary',!importToken)}${button('Review existing saved run','ironman-known-resume',runIdOf(pendingImport),'secondary')}${button('Review retained run','ironman-review-recovery',runIdOf(pendingImport),'secondary')}${button('Cancel import','close-modal','','ghost')}`;const old=occupantOf(importSlot);return `<div class="eyebrow">REVIEW AN IMPORTED LIFE</div><h2>Choose where this life belongs</h2><p>Incoming: <strong>${e(pendingImport.hero.name)}</strong> · Age ${pendingImport.age} · ${e(pendingImport.seed)}.</p><div class="import-rules">${rulesMarkup(pendingImport)}</div><div class="import-slots">${saveStore.list().map(slot=>`<label><input type="radio" name="import-slot" value="${slot.id}" ${importSlot===slot.id?'checked':''}><span>Slot ${slot.id+1} · ${slot.state?e(slot.state.hero.name)+' · Age '+slot.state.age:slot.kept?e(slot.kept.hero.name)+' · kept as it was written':'Empty'}</span></label>`).join('')}</div>${old?`<p class="notice">Replacing ${e(old.hero.name)}. A recoverable copy will be retained for this slot; export it for an independent backup.</p>${button('Export the existing life','export-slot',importSlot,'secondary')}`:'<p>This slot is empty.</p>'}<div class="modal-buttons">${button(old?'Replace this reviewed slot':'Import into the empty slot','confirm-import','','primary')}${button('Cancel import','close-modal','','ghost')}</div>`;}

function saveConflictDialog() {
  if(screen==='creation'&&creatorDraft.lifeMode==='standard'&&creationCandidate?.state)return `<span class="eyebrow">YOUR SAVED LIFE IS PROTECTED</span><h2>This slot changed while you were creating.</h2><p>The new life has not overwritten the saved life. Your exact generated life and draft are held on this page. Export the new life, or choose an empty slot to save it.</p><div class="modal-buttons">${button('Export this generated life','export','','primary')}${button('Choose an empty slot','creator-slots','','secondary')}${button('Keep this draft open','close-modal','','ghost')}</div>`;
  const conflict=saveStore.conflict(), deleted=conflict?.reason==='deleted', importing=Boolean(pendingImport);
  if(importing)return `<span class="eyebrow">YOUR SAVED LIFE IS PROTECTED</span><h2>The reviewed slot changed in another tab.</h2><p>The import was not applied. Slot ${(conflict?.id??importSlot)+1} ${deleted?'was deleted':'has a newer saved life'}. Your incoming file and the saved lives have not been changed.</p><p>Reload the saved-life list and review the import again. Your incoming file will need to be selected again.${game?' Export your current session before reloading if you want to keep its unsaved choices.':''}</p><div class="modal-buttons">${game?button('Export this session','export','','primary'):''}${button('Reload saved lives','reload-conflicted-life','','secondary')}${button('Keep this session open','close-modal','','ghost')}</div>`;
  const dirty=game&&slotSaveHealth(activeSlot,true).hasChanges;
  return `<span class="eyebrow">YOUR SAVED LIFE IS PROTECTED</span><h2>This life changed in another tab.</h2><p>${deleted?'This slot was deleted in another tab.':'Another tab saved a newer position or replaced this slot'+(conflict?.name?' with '+e(conflict.name):'')+'.'} This tab has not overwritten it.</p><p>${dirty?'Your position here is still held for this session, but saving is paused. Export it to keep these choices. Reloading will replace this tab’s unsaved position with the saved '+(deleted?'life list':'position')+'.':'This tab has an older saved copy, with no new unsaved choices. Reload the saved '+(deleted?'life list':'position')+' before continuing. You can export this copy first if you want to keep it.'}</p><div class="modal-buttons">${game?button('Export this session','export','','primary'):''}${button(deleted?'Reload saved lives':'Reload saved life','reload-conflicted-life','','secondary')}${button('Keep this session open','close-modal','','ghost')}</div>`;
}

function recoveryDialog() {
  const snapshot=saveStore.read(activeSlot),backup=saveStore.backup(activeSlot)||keptOldBackup(activeSlot);
  return `<div class="eyebrow">KEEP YOUR STORY</div><h2>That action could not be completed.</h2><p>${game?'The action was not applied. Your last valid position is still active.':'The new position was not opened. Your existing saved lives are still available.'}</p><p>${game?.battle?game.battle.outcome?'The completed encounter returned a result that could not be used. You can reload or export its protected record.':'The encounter returned a result that could not be used. You can keep this combat position and choose another move, or reload the protected position.':'You can return to the position you were using or review a protected save.'}</p>${!storageAvailable?'<p class="notice warning">Browser storage is unavailable. The protected position is held for this session; export a copy before closing the page.</p>':''}<div class="modal-buttons">${button(game?'Keep this position':'Return','close-modal','','primary')}${snapshot?button('Reload protected position','recover-current','','secondary')+button('Export protected save','export-slot',activeSlot,'secondary'):''}${backup?button('Review previous slot life','restore-backup',activeSlot,'ghost'):''}${!game?button('Open saved lives','title-load','','ghost'):''}</div>`;
}
function menuDrawer() {
  return `<div class="drawer-heading"><div><span class="eyebrow">HEARTH &amp; OATH / VOLUME I</span><h2 id="drawer-title">Your life &amp; world</h2></div></div><nav class="drawer-links" aria-label="All game views">${groupedNavigation()}</nav>${button('Sound &amp; display','game-settings','','secondary small')}<div class="drawer-section-label">KEEP YOUR STORY</div>${saveHealthMarkup(activeSlot,{live:true})}<div class="drawer-tools">${!isIronman(game)?button('Save in this browser','save','','secondary'):''}${button('Export life','export','','secondary')}${isIronman(game)?button('Archive or delete Ironman position','ironman-review',runIdOf(game),'secondary'):''}${button('Import save','import','','secondary')}${saveStore.backup(activeSlot)||keptOldBackup(activeSlot)?button('Recover previous slot life','restore-backup',activeSlot,'secondary'):''}${button('How to play','help','','secondary')}${button('Tactics rehearsal','practice-open','protect_ally','secondary')}${button('New life','new','','ghost')}${button('Main menu','title-menu','','ghost')}</div>${renderOfflineDownload(offlineDownload.state())}<p class="form-note">${e(saveSafetyHint())}</p>`;
}
function modalMarkup() {
  if(modal==='routine-review'&&routineReviewState){const q=routineReviewState.review;return `<div class="modal-overlay"><section class="modal routine-review-dialog" role="dialog" aria-modal="true" aria-labelledby="routine-review-title"><h2 id="routine-review-title">Review ${e(q.label)}</h2><p>${q.cycles} sessions · up to ${q.days} actual days · ${q.directFee} Gold in direct fees if every session is attended. Household living costs continue separately. Each session rechecks the current offer and affordability.</p><p>The routine stops for any decision, birthday, changed health, location or unfinished commitment. It never answers for you. Partial attendance and any fee already paid remain recorded.</p><div class="modal-buttons">${button('Keep planning','close-modal','','primary')}${button('Begin this routine','routine-confirm','','secondary')}</div></section></div>`;}
  if(modal==='project-abandon'&&projectAbandonReview){const p=projectAbandonReview.project;return `<div class="modal-overlay"><section class="modal project-abandon-dialog" role="dialog" aria-modal="true" aria-labelledby="project-abandon-title"><h2 id="project-abandon-title">Abandon ${e(p.title)}?</h2><p>${p.remainingDays} of ${p.totalDays} working days remain.</p><p>Already committed: ${p.cost} Gold and ${e(Object.entries(p.materials).filter(([,n])=>n>0).map(([id,n])=>n+' '+title(id)).join(', ')||'no materials')}. These resources and reserved gathering stock will not be refunded. No unfinished output is awarded.</p><div class="modal-buttons">${button('Keep working','close-modal','','primary')}${button('Abandon this project','project-abandon-confirm','','ghost')}</div></section></div>`;}
  if(modal==='herbal-care')return renderHerbalCareReview(game,herbalCareReview?.quote,uiHelpers());
  if(modal==='personal-note')return renderPersonalNoteReview(pendingPersonalNote,uiHelpers());
  if(!modal)return '';
  if(modal==='ironman-review'||modal==='ironman-recoveries'){const body=modal==='ironman-review'?ironmanReviewDialog():`<h2>Retained Ironman positions</h2><p>Review and reattach an archive before playing or exporting it.</p>${(ironmanRecoveries||[]).map(row=>`<section class="panel" ${row.kept?'data-kept-run':''}><h3>${e(row.name)}</h3><p>${row.age!=null?'Age '+row.age:''}${row.day!=null?' · Day '+row.day:''}${row.kept?' · Kept, not played here':''}</p>${button(row.kept?'Review export or deletion':'Review position','ironman-review',row.runId,'secondary')}</section>`).join('')||'<p>No retained positions are available.</p>'}`;return `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="Ironman review"><button class="modal-close button ghost" type="button" data-op="close-modal" aria-label="Close review">×</button>${body}</section></div>`;}
  if(modal==='practice')return practiceDialog();
  if(modal==='inbox'&&game)return `<div class="modal-overlay inbox-overlay"><section class="modal inbox-drawer" id="notification-inbox" role="dialog" aria-modal="true" aria-labelledby="inbox-title"><button class="modal-close button ghost" type="button" data-op="close-modal" aria-label="Close Inbox">×</button>${renderInbox(game,uiHelpers(),{selectedId:selectedNotice,soundEnabled:getAudioSettings().enabled,page:inboxPage})}</section></div>`;
  if(modal==='delete-life'&&pendingDeletion)return `<div class="modal-overlay"><section class="modal delete-life-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-life-title"><button class="modal-close button ghost" type="button" data-op="close-modal" aria-label="Keep this life">×</button><span class="eyebrow">A SAVED LIFE</span><h2 id="delete-life-title">Delete ${e(pendingDeletion.name)}?</h2><p>This removes this character and their world from this browser.${pendingDeletion.backupName?' The recovery backup in this slot will be removed too.':''} Export a copy first if you want to keep it.</p><div class="modal-buttons">${button('Keep This Life','close-modal','','primary')}${button('Export This Life','export-slot',pendingDeletion.id,'secondary')}${button('Delete This Life','confirm-delete-life','','danger')}</div></section></div>`;
  if(modal==='map'){const selectedId=selectedLocation||cartographyView(game)?.cells.find(c=>c.key===selectedHex)?.siteId||game.timeline?.journey?.destinationId||game.cartography?.route?.destination||game.locationId;const preview=game.timeline?.journey||game.cartography?.route||game.cartography?.pending?null:exploreTravelPreview(game,selectedId);return `<div class="modal-overlay map-popout-overlay"><section class="modal map-popout" role="dialog" aria-modal="true" aria-label="World Map"><button type="button" class="button ghost modal-close" data-op="close-modal" aria-label="Close Map">×</button>${renderTravelMap(game,{selectedId,preview,popup:true,scale:mapScale})}</section></div>`;}
  if(modal==='menu')return `<div class="modal-overlay drawer-overlay"><section class="modal menu-drawer" id="menu-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><button class="modal-close button ghost" type="button" data-op="close-modal" aria-label="Close menu">×</button>${menuDrawer()}</section></div>`;
  if(modal==='creator-slots')return `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="creator-slot-heading"><button class="modal-close button ghost" data-op="close-modal" aria-label="Keep current slot">×</button><h2 id="creator-slot-heading">Choose an empty save slot</h2><p>Your draft and its generated history stay with you.</p>${saveStore.list().map(slot=>button('Slot '+(slot.id+1)+' · '+(slot.state?e(slot.state.hero.name):slot.kept?e(slot.kept.hero.name):'Empty'),'creator-use-slot',slot.id,'secondary',!!(slot.state||slot.kept))).join('')}<p>Occupied lives are kept. If another tab changes a slot, its availability is checked again before saving.</p>${button('Keep current slot','close-modal','','primary')}</section></div>`;
  if(modal==='creator-leave')return `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="creator-leave-heading"><h2 id="creator-leave-heading">Keep creating this life?</h2><p>Your draft has changes. Leaving discards them; your saved lives stay as they are.</p><div class="modal-buttons">${button('Keep Creating','close-modal','','primary')}${button('Discard Draft','creator-discard','','ghost')}</div></section></div>`;
  if(modal==='profession-review'&&professionReview){const a=actionsForUI(game).find(a=>a.id===professionReview.id),r=settlementServices(game).find(r=>r.id===professionReview.service&&r.personId===professionReview.person&&r.here);return `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="trade-review-heading"><button class="modal-close button ghost" data-op="close-modal" aria-label="Close trade review">×</button><h2 id="trade-review-heading">Review this trade</h2><p>${e(a?.label||'Unavailable trade')} · ${e(r?.name||'Provider unavailable')}</p><p>${e(a?.description||'')}</p><p>${e(actionCostSummary(game,a||{}))}</p><p>${e(actionCostDetails(game,a||{}))}</p><p>Inspecting spends nothing. Confirming begins this profession and its quoted time.</p>${button('Begin this trade','profession-confirm',professionReview.id,'primary',!a||!!a.disabledReason||!r)}</section></div>`;}
  if(modal==='traits'){const creating=screen==='creation',body=renderTraitSelection(creating?creatorDraft.personalityTraits:game.hero.personality.traits,creating?creatorDraft.startAge:game.age,{creation:creating,state:game});return `<div class="modal-overlay"><section class="modal trait-picker-modal" role="dialog" aria-modal="true" aria-labelledby="trait-picker-heading"><button type="button" class="modal-close button ghost" data-op="close-modal" aria-label="Close trait list">×</button>${body}</section></div>`;}
  if(modal==='portraits'){
    const {creating,person,age}=galleryContext();
    const body=renderPortraitGallery(person,{age,state:portraitGalleryState,currentPerson:creating?creatorDraft:game.hero,reason:creating?'':portraitSelectionReason(game),canChooseHeritage:creating||game.hero.appearance.heritageVersion!==1});
    return `<div class="modal-overlay"><section class="modal portrait-gallery-modal" role="dialog" aria-modal="true" aria-labelledby="portrait-gallery-title"><button class="modal-close button ghost" type="button" data-op="close-modal" aria-label="Close portrait book">×</button>${body.replace('<h2>','<h2 id="portrait-gallery-title">')}</section></div>`;
  }
  const body=modal==='gear-preset-review'?renderGearPresetReview(game,gearPresetReview,uiHelpers()):modal==='save-conflict'?saveConflictDialog():modal==='home-purchase'?renderHomePurchase(homePurchaseReview,uiHelpers()):modal==='recovery'?recoveryDialog():modal==='school-transfer'?renderSchoolTransfer(schoolTransferReview,uiHelpers()):modal==='import-review'&&pendingImport?importReview():modal==='overwrite'?`<div class="eyebrow">REPLACE A SAVED LIFE</div><h2>Replace ${e(occupantOf(overwriteSlot)?.hero?.name||'this life')}?</h2><p>This slot will be replaced when you finish creating a character. You can export the existing life first.</p><div class="modal-buttons">${button('Export this life','export-slot',overwriteSlot,'secondary')}${button('Create replacement','confirm-overwrite','','primary')}${button('Keep this life','close-modal','','ghost')}</div>`:modal==='settings'?`<h2>Sound &amp; display</h2>${audioSettingsPanel()}${displaySettingsPanel()}${button(fullscreenLabel(),'fullscreen','','secondary')}`:modal==='help'?helpModal():modal==='appearance'?customizationModal():modal==='preferences'?preferencesModal():`<div class="eyebrow">A FRESH PAGE</div><h2>Begin another life?</h2><p>Your current life stays in its own slot. Choose another slot for a new character, or explicitly replace a saved life.</p><div class="modal-buttons">${button('Export current life','export','','secondary')}${button('Create a new character','confirm-new','','primary')}${button('Keep playing','close-modal','','ghost')}</div>`;
  return `<div class="modal-overlay"><section class="modal" ${modal==='recovery'?'data-recovery-dialog':modal==='save-conflict'?'data-save-conflict-dialog':''} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close button ghost" type="button" data-op="close-modal" aria-label="Close dialog">×</button>${body.replace('<h2>', '<h2 id="modal-title">')}</section></div>`;
}
function galleryContext(){
 const creating=screen==='creation',base=creating?creatorDraft:game,age=creating?base.startAge:base.age;
 let view=base;if(portraitGalleryState.heritage)view=creating?selectCreatorHeritage(base,portraitGalleryState.heritage):declareCharacterHeritage(base,portraitGalleryState.heritage);
 return {creating,age,person:creating?view:view.hero};
}
function openModal(kind,trigger) {
  focusReturn=trigger?.dataset?.op?{op:trigger.dataset.op,id:trigger.dataset.id}:null;
  if(kind==='portraits'){portraitGalleryState={page:0,presentation:'all',archetype:'all',showLocked:false};}
  modal=kind;render();
}
function closeModal() {
  if(ironmanFenced())return;
  practiceController.cancelPending();
  if(practiceController.current()){closePractice(practiceController.current().id);return;}
  clearTimeout(spatialClickTimer);
  if(modal==='save-conflict'){saveConflictDismissed=true;pendingImport=null;}
  if(modal==='routine-review')routineReviewState=null;
  if(modal==='project-abandon')projectAbandonReview=null;
  if(modal==='profession-review')professionReview=null;
  if(modal==='herbal-care')herbalCareReview=null;
  if(modal==='personal-note')pendingPersonalNote=null;
  if(modal==='gear-preset-review')gearPresetReview=null;
  if(modal==='school-transfer')schoolTransferReview=null;
  if(modal==='home-purchase')homePurchaseReview=null;
  if(modal==='delete-life')pendingDeletion=null;
  if(modal==='import-review')pendingImport=null;
  modal=null;render();
  restoreModalFocus();
}
function restoreModalFocus() {
  if(!focusReturn)return;
  const {op,id}=focusReturn;focusReturn=null;
  afterCurrentRender(()=>{
    const trigger=[...root.querySelectorAll('[data-op]')].find(el=>el.dataset.op===op&&el.dataset.id===id&&el.getClientRects().length);
    (trigger||root.querySelector('#main-content h1, #main-content h2, .creator-fieldset:not([hidden]) h1, .creator-review h1, #slot-heading, .title-menu-item'))?.focus({preventScroll:true});
  });
}
function afterCurrentRender(callback) {
  const revision=renderRevision,dialog=modal,owner=viewOwner(),sessionEpoch=ironmanSession.status().epoch;
  requestAnimationFrame(()=>{if(revision===renderRevision&&dialog===modal&&ownsView(owner)&&sessionEpoch===ironmanSession.status().epoch)callback();});
}
function focusControl(op,id,fallback=null) {
  afterCurrentRender(()=>{
    const target=[...root.querySelectorAll('[data-op]')].find(el=>el.dataset.op===op&&el.dataset.id===id&&!el.disabled&&el.getClientRects().length)||(Array.isArray(fallback)?fallback.map(selector=>root.querySelector(selector)).find(Boolean):fallback?root.querySelector(fallback):null);
    if(!modal||target?.closest('.modal'))target?.focus({preventScroll:true});
  });
}
function conciseOutcome(message) {
  const text=String(message||'').replace(/\s+/g,' ').trim();
  if(text.length<=280)return text;
  const excerpt=text.slice(0,277),end=excerpt.lastIndexOf(' ');
  return excerpt.slice(0,end>0?end:excerpt.length)+'…';
}
function announceView(message) {
  const status=document.getElementById('view-status');if(!status)return;
  const revision=++announcementRevision;
  status.textContent='';afterCurrentRender(()=>{if(revision===announcementRevision)status.textContent=message;});
}
function announceJournalResults(){announceView([...root.querySelectorAll('.simple-journal [data-view-results]')].map(n=>n.textContent).join(' ')||'Journal search updated.');}
function focusRoute(selectors='#main-content h1, #main-content h2, .workspace-body') {
 afterCurrentRender(()=>{const target=root.querySelector(selectors);if(!target)return;if(!['BUTTON','INPUT','SELECT','TEXTAREA','A','SUMMARY'].includes(target.tagName)&&target.getAttribute('tabindex')===null)target.setAttribute('tabindex','-1');target.focus();});
}
function refreshSelection(op,id,{focusOp=op,focusId=id,focusSelector=null}={}) {
  render();
  afterCurrentRender(()=>{
    const controls=[...root.querySelectorAll('[data-op]')];
    const control=controls.find(el=>el.dataset.op===focusOp&&el.dataset.id===String(focusId)&&!el.disabled&&el.getClientRects().length);
    const target=(focusSelector?root.querySelector(focusSelector):control)||root.querySelector('.workspace-body, .creator-fieldset:not([hidden]) h1');
    target?.focus({preventScroll:true});
    const label=!focusSelector?control?.textContent?.replace(/\s+/g,' ').trim():'';
    const results=root.querySelector('[data-view-results]')?.textContent?.replace(/\s+/g,' ').trim();
    announceView([label?label+' selected.':'',results].filter(Boolean).join(' '));
  });
}
function sceneReturnContext(){return {game,slot:activeSlot,revision:sceneActionRevision,conflict:Boolean(activeSaveConflict())};}
function sceneOrigin(){if(tab==='journal'&&workspaceSection('journal',workspaceSections.journal)==='active')return {kind:'quest-journal',id:journalCategory};return serviceSession?{kind:'service',id:serviceSession}:selectedContact?{kind:'person',id:selectedContact}:null;}
function sceneFocusTarget(node){
 if(!node?.closest?.('.workspace-body'))return null;
 if(node.id)return {elementId:node.id};
 if(node.dataset?.op)return {op:node.dataset.op,id:node.dataset.id};
 return null;
}
function sceneReturnMarkup(){
 if(!sceneReturn)return '';
 if(screen!=='game'||!sceneUtilityTab(tab)||!validSceneReturn(sceneReturn,sceneReturnContext(),sceneReturnReaders)){sceneReturn=null;return '';}
 const trail=sceneReturn,name=trail.source.name,label='Return to '+name+(trail.presentation.craft?'’s workbench':'');
 return `<nav class="notice scene-return" aria-label="Return to the scene">${button(e(label),'scene-return','','ghost small')}<span class="small-copy">${trail.presentation.shop||trail.presentation.craft?'Unconfirmed offers and design selections were cleared.':'No time passes when you return.'}</span></nav>`;
}
function returnToScene(){
 const trail=sceneReturn;
 // Revalidate on activation too, not merely when the control was rendered.
 if(screen!=='game'||modal||!sceneUtilityTab(tab)||!validSceneReturn(trail,sceneReturnContext(),sceneReturnReaders)){sceneReturn=null;render();return;}
 if(trail.source.kind==='quest-journal'){sceneReturn=null;tab='journal';workspaceSections.journal='active';journalCategory=trail.presentation.category;journalQuery=trail.presentation.query;render();focusRoute('#main-content h1');return;}
 sceneReturn=null;sceneFocus=null;serviceSession=trail.source.kind==='service'?trail.source.id:null;selectedContact=trail.source.kind==='person'?trail.source.id:null;
 serviceTopic=trail.presentation.topic;shopSession=null;craftSession=null;
 const r=serviceSession&&settlementServices(game).find(r=>r.id===serviceSession&&r.personId===trail.source.personId&&r.here);
 if(r&&trail.presentation.craft)craftSession={...newCraftSession(game,r),...trail.presentation.craft,selected:null,quote:null};
 if(r&&trail.presentation.shop){const view=trail.presentation.shop,fresh=newTradeDraft(game,view.vendor),mode=view.mode==='trade'&&shopAccessReason(game,view.vendor)?'dialogue':view.mode;shopSession={...fresh,...view,mode,selected:null,quote:null,...(mode==='trade'?{draft:newTradeDraft(game,view.vendor)}:{})};}
 tab='place';modal=null;movement=null;selectedRoom=null;spatialMode='settlement';spatialPane='actions';rememberWorkspace();render();
 afterCurrentRender(()=>{
  if(modal||tab!=='place'||game!==trail.game||sceneActionRevision!==trail.revision)return;
  const focus=trail.focus,blocked=['shop-confirm','shop-add','shop-remove','craft-confirm','craft-continue'];
  const node=focus&&!blocked.includes(focus.op)?focus.elementId?[...root.querySelectorAll('[id]')].find(n=>n.id===focus.elementId):[...root.querySelectorAll('[data-op]')].find(n=>n.dataset.op===focus.op&&n.dataset.id===focus.id):null;
  const target=node?.closest('.workspace-body')&&!node.disabled&&node.getClientRects().length?node:root.querySelector(craftSession?'#craft-heading':shopSession?.mode==='trade'?'#trade-heading':serviceSession?'#meeting-speaker, #shop-speaker':'.dialogue-speaker h2');
  target?.focus({preventScroll:true});
 });
}
function navigate(id) {
  if(ironmanFenced())return;
  if(id==='quests'){id='journal';workspaceSections.journal='active';}
  if(id==='lore'){id='journal';workspaceSections.journal='notes';}
  if(['career','health','adventure','realm','household','workshop'].includes(id)){id='place';serviceSession=null;}
  if(!navigationGroups.some(([,rows])=>rows.some(([key])=>key===id))&&id!=='place')return;
  sceneReturn=sceneReturnForNavigation(sceneReturn,tab,id,sceneReturnContext(),sceneOrigin(),sceneReturnReaders,{serviceTopic,shopSession:currentShopSession(game,shopSession),craftSession:currentCraftSession(game,craftSession),journalQuery},sceneFocusTarget(document.activeElement)||sceneFocus);
  sceneFocus=null;craftSession=null;shopSession=null;serviceSession=null;serviceTopic=null;
  if(id==='map'&&tab==='relationships'&&!game?.conversations?.pending)selectedContact=null;
  gearPresetReview=null;
  tab=id;if(id==='life'){workspaceReturn=null;if(game?.event||game?.battle||game?.conversations?.pending)workspaceSections.life='present';}modal=null;movement=null;rememberWorkspace();render();
  focusRoute();
}
function currentMomentBanner() {
  if(!game||tab==='life'&&workspaceSection('life',workspaceSections.life)==='present')return '';
  if(tab==='map'&&(game.timeline?.journey||game.cartography?.pending||game.cartography?.route)&&!game.event&&!game.battle&&!game.conversations?.pending)return '';
  const pending=game.event?{text:`“${game.event.title}” is waiting for your decision.`,view:'life'}:
    game.battle?{text:'An encounter is still unfolding.',view:'life'}:
    game.conversations?.pending?{text:getContacts(game).some(person=>person.id===game.conversations.pending.personId)?`${getContacts(game).find(person=>person.id===game.conversations.pending.personId).name} is waiting for your reply.`:'An unfinished earlier exchange remains to close; its exact person is unavailable.',view:nearbyContacts(game).some(p=>p.id===game.conversations.pending.personId)?'place':'life'}:
    game.delve||game.maze||game.dungeon||game.rpg?.expedition?{text:'Your expedition is still underway.',view:'life'}:
    game.justice?.prison?{text:'Your sentence is still being served.',view:'life'}:
    game.adventuring?.expedition?{text:'Your descent is still underway.',view:'life'}:
    game.workshop?.project?{text:'Your workshop project is still underway.',view:'life'}:
    game.careers?.batch?{text:'Your working commitment is paused until you continue it.',view:'life'}:
    getLifeCommitment(game)?{text:`${getLifeCommitment(game).title} is still underway.`,view:'life'}:
    game.cartography?.pending?{text:'Your journey is paused along the trail.',view:'map'}:
    game.timeline?.journey?{text:'You are partway through a journey.',view:'map'}:
    game.life?.plan?{text:'Your saved year is waiting to continue.',view:'life'}:null;
  if((tab==='place'||tab==='life')&&(game.delve||game.maze||game.dungeon||game.rpg?.expedition||game.adventuring?.expedition))return '';
  if(!pending||tab===pending.view&&(pending.view!=='life'||workspaceSection('life',workspaceSections.life)==='present')&&(!game.conversations?.pending||selectedContact===game.conversations.pending.personId))return '';
  if(game.conversations?.pending)return `<div class="notice view-attention" role="status">${e(pending.text)} ${button('Return to the conversation','show-contact',game.conversations.pending.personId,'ghost small')}</div>`;
  return `<div class="notice view-attention" role="status">${e(pending.text)} ${button('Return to the moment',pending.view==='life'?'workspace-open':'tab',pending.view==='life'?'life:present':pending.view,'ghost small')}</div>`;
}

const retainedScrollSelectors=['.game-content','.workspace-body','.inventory-grid','.person-register-list','.creator-screen','.creator-controls','.creator-portrait','.trade-item-grid','.slot-list'];
const paneScrollPositions=new Map(),dialogScrollPositions=new Map();
function viewPositionKey(){
 if(screen!=='game')return screen+(screen==='creation'?':'+creatorStep:screen==='slots'?':'+slotsMode:'');
 const context=tab==='journal'&&workspaceSection('journal',workspaceSections.journal)==='active'?'quests:'+journalCategory:tab==='place'?(serviceSession?'service:'+serviceSession:selectedContact?'person:'+selectedContact:game?.cartography?.interior?.roomId||'gate'):'';
 return tab+':'+(workspaceSection(tab,workspaceSections[tab])||'main')+':'+context;
}
function capturePaneScroll(){
 if(renderedWorkspaceKey){const positions={};for(const selector of retainedScrollSelectors)positions[selector]=[...root.querySelectorAll(selector)].map(n=>({top:n.scrollTop,left:n.scrollLeft}));paneScrollPositions.set(renderedWorkspaceKey,positions);}
 if(renderedModal){const n=root.querySelector('.modal');if(n&&!n.classList.contains('map-popout'))dialogScrollPositions.set(renderedModal,{top:n.scrollTop,left:n.scrollLeft});}
}
function restorePaneScroll(key){
 const positions=paneScrollPositions.get(key);if(positions)for(const selector of retainedScrollSelectors)root.querySelectorAll(selector).forEach((n,i)=>{const p=positions[selector]?.[i];if(p){n.scrollTop=p.top;n.scrollLeft=p.left;}});
 const dialog=modal&&dialogScrollPositions.get(modal),n=root.querySelector('.modal');if(dialog&&n&&!n.classList.contains('map-popout')){n.scrollTop=dialog.top;n.scrollLeft=dialog.left;}
}
function preserveViewPosition() {
  const person=game?`${game.seed}:${game.timeline?.birthDay||0}:${game.dynasty?.generation||1}`:null;
  if(person!==renderedPerson){disclosureStates.clear();conversationPositions.clear();workspacePositions.clear();paneScrollPositions.clear();dialogScrollPositions.clear();renderedWorkspaceKey=null;circlePosition=0;renderedPerson=person;return;}
  capturePaneScroll();
  const workspace=root.querySelector('.workspace-body');if(workspace&&renderedWorkspaceKey)workspacePositions.set(renderedWorkspaceKey,{top:workspace.scrollTop,left:workspace.scrollLeft,windowY:window.scrollY||0});
  root.querySelectorAll('.game-content details[data-disclosure]').forEach(detail=>disclosureStates.set(`${renderedTab}:${detail.dataset.disclosure}`,detail.open));
  const circle=root.querySelector('.contact-list');if(circle)circlePosition=circle.scrollLeft;
  const thread=root.querySelector('.conversation-thread'), messages=thread?.querySelector('.thread-messages');
  if(messages)conversationPositions.set(thread.dataset.contactId,{top:messages.scrollTop,count:messages.querySelectorAll('.message-entry').length});
}
function restoreViewPosition() {
  root.querySelectorAll('.game-content details[data-disclosure]').forEach(detail=>{
    const key=`${tab}:${detail.dataset.disclosure}`;
    if(disclosureStates.has(key))detail.open=disclosureStates.get(key);
  });
  const circle=root.querySelector('.contact-list'), active=circle?.querySelector('.contact-card.active');
  if(circle){
    circle.scrollLeft=circlePosition;
    if(active){const bounds=circle.getBoundingClientRect(), item=active.getBoundingClientRect();if(item.left<bounds.left||item.right>bounds.right)circle.scrollLeft+=item.left-bounds.left-parseFloat(getComputedStyle(circle).paddingLeft)-circle.clientLeft;}
  }
  const thread=root.querySelector('.conversation-thread'), messages=thread?.querySelector('.thread-messages');
  if(messages){const old=conversationPositions.get(thread.dataset.contactId);messages.scrollTop=!old||old.count!==messages.querySelectorAll('.message-entry').length?messages.scrollHeight:old.top;}
  const key=viewPositionKey(),workspace=root.querySelector('.workspace-body'),pos=workspacePositions.get(key);
  if(workspace){workspace.scrollTop=pos?.top||0;workspace.scrollLeft=pos?.left||0;}
  if(pos&&(window.scrollY||0)!==pos.windowY)window.scrollTo({top:pos.windowY,behavior:'instant'});
  restorePaneScroll(key);
  renderedWorkspaceKey=key;renderedTab=tab;
}

function render() {
  renderRevision++;
  if(!adoptingIronman&&(ironmanEnded||ironmanStatus&&['blocked','ended'].includes(ironmanStatus.phase))){
    root.innerHTML=ironmanStatusMarkup();document.body.classList.remove('game-mode','creation-mode','has-dialog');document.body.classList.add('title-mode');return;
  }
  const endMeasure=beginUiMeasure('render:'+screen+':'+tab);uiRendering=true;uiActions=null;
  try {
  const chartLife=game?game.seed+':'+(game.dynasty?.generation||1):null;
  if(movement||chartLife!==mapLife){mapCamera.forget();mapLife=chartLife;}else mapCamera.capture();
  preserveViewPosition();
  const oldFeed=root.querySelector('.life-feed-list');if(oldFeed)feedPosition=oldFeed.scrollTop;
  const entryCount=currentJournal().length, changedFeed=entryCount!==feedCount;
  const views={adventure:()=>game.rpg?.expedition?depthDungeonPanel(game,uiHelpers()):adventurePage(game,actionsForUI(game),uiHelpers())+(uiHelpers().section==='delves'?depthPanel(game,uiHelpers(),'adventure'):''),realm:()=>uiHelpers().section==='factions'?depthPanel(game,uiHelpers(),'factions'):realmPage(game,actionsForUI(game),uiHelpers())+(uiHelpers().section==='law'?sanctuaryPanel(game,uiHelpers(),'law'):''),life:lifeView,activities:activitiesView,household:householdPage,workshop:workshopPage,lore:lorePage,career:careerViewPage,health:healthViewPage,legacy:legacyViewPage,character:characterView,party:partyView,relationships:relationshipsView,quests:questsView,inventory:inventoryView,map:mapView,place:placeView,journal:journalView};
  if(tab==='quests'){tab='journal';workspaceSections.journal='active';}
  if(['career','health','adventure','realm','household','workshop','lore'].includes(tab)){tab=tab==='lore'?'journal':'place';}
  const viewName=tab==='career'&&game?.age<16?'School':tab==='place'?'Your Location':navigationLabel(tab,navigationGroups.flatMap(([,rows])=>rows).find(([id])=>id===tab)?.[1]||'Life');
  const workspaceContent=screen==='game'?(tab==='life'&&workspaceSection('life',workspaceSections.life)==='present'?firstDayGuideMarkup():'')+(views[tab]||lifeView)():'';
  const sceneReturnControl=sceneReturnMarkup();
  const farmerDay=screen==='game'&&tab==='life'&&workspaceSection('life',workspaceSections.life)==='present'&&farmerDayVisible(game);
  const notice=game?.notice?`<details class="notice latest-result" data-disclosure="latest-result"><summary>Latest result · ${e(game.notice.length>100?game.notice.slice(0,100)+'…':game.notice)}</summary><p>${e(game.notice)}</p></details>`:'';
  const markup=(screen!=='game'? (screen==='creation'?creation():screen==='slots'?saveSlotsScreen():screen==='settings'?settingsScreen():titleScreen()):`<div class="app-shell ${game?'has-life':'new-life'} game-frame" ${modal?'inert aria-hidden="true"':''}>${sidebar()}<div class="main-shell">${topbar()}<main id="main-content" aria-label="${e(viewName)}"><div class="game-content ${e(tab)}-content ${farmerDay?'farmer-day-content':''}">${farmerDay?'':notice}${currentMomentBanner()}${sceneReturnControl}${activeSaveConflict()?'<div class="notice warning" role="status">Saving is paused because this life changed in another tab. '+(slotSaveHealth(activeSlot,true).hasChanges?'Your session is not saved. ':'This tab has an older saved copy, with no new unsaved choices. ')+button('Review saved-life conflict','review-save-conflict','','secondary small')+'</div>':''}${saveHealthMarkup(activeSlot,{live:true,id:'storage-warning'})}<div class="workspace-body" tabindex="0" role="region" aria-label="${e(viewName)} workspace">${tab==='career'&&game.age<16||tab==='journal'&&farmView(game)?'':renderWorkspaceNavigation(tab,workspaceSections[tab],uiHelpers())}<div class="workspace-page" data-workspace-section="${e(workspaceSection(tab,workspaceSections[tab])||'main')}">${workspaceContent||'<section class="panel workspace-empty"><h2>A chapter still to come</h2><p>No activity or account is available here in this part of your life. Your current needs and choices remain in Today.</p></section>'}</div></div>${farmerDay?notice:''}</div></main>${commandbar()}${bottomNav()}</div></div>`)+`<input id="save-file" type="file" accept=".json,application/json" hidden>${modalMarkup()}${screen==='game'?renderNotificationToasts(notificationToasts,uiHelpers(),{hidden:Boolean(modal)}):''}<div id="toast" class="toast" role="status" hidden></div>`;
  root.innerHTML=screen==='game'?formatPlaceMarkup(markup,game):markup;
  const entrySurface=root.querySelector('.title-screen,.menu-screen,.creator-screen');if(entrySurface){entrySurface.inert=!!modal;if(modal)entrySurface.setAttribute('aria-hidden','true');}
  document.body.classList.toggle('title-mode',screen==='title'||screen==='slots'||screen==='settings');
  document.body.classList.toggle('creation-mode',screen==='creation');
  document.body.classList.toggle('game-mode',screen==='game');
  setAudioScene(audioSceneFor(game,screen));
  restoreViewPosition();
  document.body.classList.toggle('has-dialog',!!modal);
  root.querySelectorAll('#main-content h1, #main-content h2').forEach(el=>el.setAttribute('tabindex','-1'));
  root.querySelectorAll('.world-board,.hex-board:not(.compact)').forEach(el=>el.style.setProperty('--map-scale',mapScale));
  requestAnimationFrame(()=>mapCamera.restore(()=>centerWorldMap(root,selectedHex||selectedLocation)));
  if(movement){animateMapMovement(root,movement);movement=null;}
  const feed=root.querySelector('.life-feed-list');
  if(feed){
    feed.scrollTop=changedFeed?feed.scrollHeight:feedPosition;feedCount=entryCount;
    if(changedFeed&&window.innerWidth<1000&&!ageControlState().reason)requestAnimationFrame(()=>{
      if(!feed.isConnected||ageControlState().reason||modal)return;
      const dock=root.querySelector('.mobile-command-dock'), last=[...feed.querySelectorAll('.life-entry')].at(-1);
      if(!dock?.getClientRects().length||!last)return;
      const overlap=last.getBoundingClientRect().bottom-(dock.getBoundingClientRect().top-12);
      if(overlap>0)window.scrollBy({top:overlap,behavior:'instant'});
    });
  }
  if(modal&&modal!==renderedModal){const opening=modal;queueMicrotask(()=>{if(modal===opening)root.querySelector(['creator-leave','project-abandon','routine-review'].includes(modal)?'[data-op="close-modal"]':'.modal .modal-close')?.focus();});}renderedModal=modal;
  }finally{uiRendering=false;uiActions=null;endMeasure();}
}

function toast(message) {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=message; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{t.hidden=true;},3200);
}
function exportSave() { exportState(screen==='creation'&&creatorDraft.lifeMode==='standard'&&creationCandidate?.state?creationCandidate.state:game); }
function exportState(state) {
  if(isIronman(state)){
    if(state!==game){toast('Resume this Ironman position before exporting. Retained archives must first be reattached.');return;}
    if(ironmanFenced())return;
    return ironmanSession.protect(head=>downloadState(head));
  }
  if(ironmanFenced())return;
  return downloadState(state);
}
/** An Ironman life this page will not open is still the player's: export its authoritative head from the store, under the save lock, without adopting it. */
async function exportKeptIronman(state,slot){
  if(ironmanFenced())return;
  const owner=viewOwner();
  const result=await saveStore.inspectIronman(typeof state==='string'?state:runIdOf(state),{intent:'export',slot,consume:head=>{downloadState(head);return true;}});
  if(!ownsView(owner))return;
  if(result?.value!==true)toast('This run could not be read for export just now. Nothing was changed; try again.');
}
function downloadState(state) {
  if(!state) return;
  let url;
  try {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}), a=document.createElement('a');
    url=URL.createObjectURL(blob);a.href=url;a.download=exportFileName(state);
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(`Download started: ${a.download}. Browser save status is unchanged.`);
  } catch {
    if(url)URL.revokeObjectURL(url);
    toast('The save file could not be downloaded. Keep this page open and try Export again.');
  }
}
function previewAvatar(form) {
  if(form.id!=='character-form')return;
  const previousAge=creatorDraft.startAge,previousAncestry=creatorDraft.appearance.ancestry,previousAncestryChoice=creatorDraft.ancestryChoice;
  adoptCreatorDraft(captureCreatorDraft(new FormData(form),creatorDraft));
  const heritageDescription=root.querySelector('[data-heritage-description]');if(heritageDescription)heritageDescription.textContent=creatorDraft.heritageChoice==='fate'?'Your heritage is revealed when this life begins.':effectiveHeritage(creatorDraft.appearance).description;
  const age=creatorDraft.startAge,preview=root.querySelector('[data-avatar-preview]');
  if(preview)preview.innerHTML=renderAvatar(creatorDraft,{size:'hero',age});
  const name=root.querySelector('[data-preview-name]');if(name)name.textContent=creatorDraft.name;
  const nameInput=root.querySelector('[name="name"]');if(nameInput&&creatorDraft.nameChoice==='fate')nameInput.value=creatorDraft.name;
  const count=root.querySelector('[data-start-age]'),description=root.querySelector('[data-age-description]');
  if(count)count.textContent=String(age);if(description)description.textContent=startingAgeDescription(age)+' '+age+' years of history · '+attributePointBudget(age)+' ability points.';const exact=root.querySelector('#start-age-number');if(exact)exact.value=String(age);
  const controls=root.querySelector('[data-portrait-controls]');if(controls)controls.innerHTML=renderCreatorPortraitControls(creatorDraft);
  const origins=root.querySelector('[data-origin-options]');
  if(origins&&(previousAge!==age||previousAncestry!==creatorDraft.appearance.ancestry||previousAncestryChoice!==creatorDraft.ancestryChoice))origins.innerHTML=renderCreatorOriginOptions(creatorDraft);
  const undo=root.querySelector('[data-op="creator-undo"]');if(undo)undo.disabled=!creatorUndo||creatingLife;
  const notice=root.querySelector('[data-creator-notice]');if(notice){notice.hidden=!creatorNotice;notice.textContent=creatorNotice;}
  const error=root.querySelector('[data-creator-error]');if(error){error.hidden=!creatorError;error.textContent=creatorError;}if(creatorStep===2){const review=root.querySelector('[data-creator-review]');if(review)review.innerHTML=renderCreatorReview(creatorDraft);}
  if(previousAncestry!==creatorDraft.appearance.ancestry||previousAncestryChoice!==creatorDraft.ancestryChoice){render();root.querySelector('[name="ancestry"]')?.focus({preventScroll:true});}
}

async function downloadGame(){ return offlineDownload.start(); }
function cancelGameDownload(){ offlineDownload.cancel(); }
function localOfflineGame(){
  const scripts=[...document.querySelectorAll('body > script')];
  const inline=scripts.filter(script=>!script.src).map(script=>script.outerHTML).join('\n');
  // A local file must never silently fall back to the hosted game, and only
  // the pre-render opening shell belongs in a fresh copy, never a live life.
  if(!scripts.some(script=>!script.src&&script.type==='module'))throw new Error('This local game has no complete inline runtime.');
  return new Blob(['<!doctype html><html lang="en"><head>',document.head.innerHTML,'</head><body><div id="app">',bootMarkup,'</div><div id="view-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>',inline,'</body></html>'],{type:'text/html;charset=utf-8'});
}
function saveOfflineGameBlob(blob,{signal}){
  if(signal.aborted)return;
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  if(signal.aborted){URL.revokeObjectURL(url);return;}
  try{link.href=url;link.download='hearth-and-oath.html';link.click();}
  catch(error){URL.revokeObjectURL(url);throw error;}
  // This is a complete Blob, not a partial file or a saved-life export. Give
  // the browser time to accept it; revoke this exact URL, never another run's.
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function refreshOfflineDownload(state){
  updateOfflineDownload(root,state);
  // The mounted panel already owns a polite live status. Only a closed drawer
  // needs the global fallback; announcing both would repeat the same outcome.
  if(root.querySelector('[data-offline-download]'))return;
  if(state.phase==='ready')toast('Offline game download started. Check your browser downloads.');
  else if(state.phase==='error')toast('The offline game could not be prepared. Open the menu to retry.');
  else if(state.phase==='cancelled')toast('Offline download cancelled. No game file was created.');
}

function compactStory(text){const words=String(text||'').split(/\s+/);if(words.length<=150)return paragraphs(text);const sentences=String(text).split(/(?<=[.!?])\s+/);let count=0,index=0;while(index<sentences.length&&count<100){count+=sentences[index].split(/\s+/).length;index++;}return paragraphs(sentences.slice(0,index).join(' '))+`<details class="story-context"><summary>Read the full context</summary>${paragraphs(sentences.slice(index).join(' '))}</details>`;}
function selectDestination(id,{center=false,fromPicker=false}={}){
  if(ironmanFenced())return;
 clearTimeout(spatialClickTimer);
 if(!game||modal&&modal!=='map'||!game.cartography?.sites[id])return;
 selectedLocation=id;selectedHex=null;tab='map';spatialMode='country';workspaceReturn='map';
 render();rememberWorkspace();
 if(center){mapCamera.forget();requestAnimationFrame(()=>{centerWorldMap(root,id);mapCamera.capture();});}
 if(fromPicker)root.querySelector('#journey-destination')?.focus({preventScroll:true});
 else focusControl('destination-select',id,'#spatial-selection-title');
 announceView((game.world.locations.find(p=>p.id===id)?.name||'Destination')+'. Selected. '+(modal==='map'?'Close the map to review the route and confirm your journey.':'Review the route, then choose Confirm Journey to travel.'));
}
function inspectMazeMapRoom(id,{heading=false}={}){
 if(!game?.maze||modal||!Number.isSafeInteger(id)||!game.maze.visited.includes(id))return;
 mazeMapSession=currentMazeMapSession(game,mazeMapSession);if(!mazeMapSession)return;
 mazeMapSession={...mazeMapSession,mode:'inspect',selected:id};render();
 focusControl('maze-map-select',String(id),heading?'#maze-map-selected':'.maze-grid');
 announceView((root.querySelector('#maze-map-selected')?.textContent||'Recorded room')+'. Inspected without walking.');
}
function inspectSpatialTarget(kind,id,{keyboard=false}={}){
  if(ironmanFenced())return;
  if(!game||modal&&modal!=='map')return;
  if(kind==='hex'){if(!hexAtlas(game).byKey[id])return;selectedHex=id;selectedLocation=null;spatialMode='country';}
  else if(kind==='room'){if(!cityRooms(game).some(r=>r.id===id))return;selectedRoom=id;spatialMode='settlement';}
  else if(kind==='rpg'){const x=game.rpg?.expedition,r=x?.rooms.find(r=>r.id===id),current=x?.rooms.find(r=>r.id===x.roomId);if(!r||!r.visited&&!current?.neighbors.includes(id))return;selectedDungeonRoom=id;spatialMode='dungeon';}
  else if(game.adventuring?.expedition?.layoutVersion===1){if(!radiantView(game)?.rooms.some(r=>'radiant_'+r.id===id))return;selectedDungeonRoom=id;spatialMode='dungeon';}
  else {if(!dungeonView(game)?.rooms.some(r=>r.id===id))return;selectedDungeonRoom=id;spatialMode='dungeon';}
  tab=kind==='hex'?'map':kind==='room'?'place':'life';workspaceReturn=kind==='hex'?'map':null;
  spatialPane='actions';render();rememberWorkspace();
  if(modal==='map'){focusControl('hex-select',id);announceView((root.querySelector('[data-op="hex-select"][aria-pressed="true"]')?.getAttribute('aria-label')||'Map point')+'. Selected. Close the map to review travel.');return;}
  if(keyboard)requestAnimationFrame(()=>root.querySelector('#spatial-selection-title')?.focus({preventScroll:true}));
  else focusControl(kind==='hex'?'hex-select':kind==='room'?'room-select':'dungeon-select',id,'#spatial-selection-title');
  announceView((root.querySelector('#spatial-selection-title')?.textContent||'Map point')+'. Inspected. Choose a separate Confirm command to move.');
}
function moveSpatialTarget(kind,id){
  if(ironmanFenced())return;
  if(!game||modal&&modal!=='map')return;
  const offer=spatialMoveOffer(game,kind,id,actionsForUI(game));
  if(!offer){inspectSpatialTarget(kind,id);toast('Choose an available neighboring path, or resolve the current room first.');return;}
  unlockAudio();update(offer.op==='choice'?chooseEventOption(game,offer.id):chooseAction(game,offer.id),undefined,{afterAdopt:()=>{if(modal==='map'){modal=null;focusReturn=null;}workspaceReturn='map';spatialMode=kind==='hex'?'country':kind==='room'?'settlement':'dungeon';if(!game.event&&!game.battle&&!game.conversations?.pending)tab='map';render();focusControl(null,null,['.story-scene h2','#spatial-selection-title','.map-inspector h2','.settlement-map h2','.depth-dungeon-actions h2','.workspace-body']);}});
}
cancelInventoryDrag=installInventoryDrag(root,{getState:()=>ironmanFenced()?null:game,onEquip:id=>{if(!ironmanFenced())update(equipGear(game,id));},announce:message=>toast(message)});
root.addEventListener('dblclick',event=>{if(event.target.isConnected===false||ironmanFenced()||practiceController.current())return;if(mapCamera.isDragClick(event)){event.preventDefault();return;}const t=event.target.closest('[data-op]');if(t?.dataset.op==='destination-select'){event.preventDefault();return;}if(!t||t.disabled||!['hex-select','room-select','dungeon-select'].includes(t.dataset.op))return;event.preventDefault();clearTimeout(spatialClickTimer);const kind=t.dataset.op==='hex-select'?'hex':t.dataset.op==='room-select'?'room':game?.rpg?.expedition?'rpg':'dungeon';moveSpatialTarget(kind,t.dataset.id);});
root.addEventListener('keydown',event=>{
  if(event.repeat&&['Enter',' '].includes(event.key)&&event.target.closest?.('[data-op="herbal-care-confirm"],#player-note,.runestone-game,#character-form .begin-button,[data-op="profession-confirm"],[data-op="gallery-select"],[data-op="destination-select"]')){event.preventDefault();return;}
  if(event.target.isConnected===false||ironmanFenced()||practiceController.current())return;
  const destination=event.target?.closest?.('[data-op="destination-select"]');if(destination&&!destination.disabled&&['Enter',' '].includes(event.key)&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();clearTimeout(spatialClickTimer);selectDestination(destination.dataset.id);return;}
  if(game?.maze&&!modal&&event.target.closest?.('.maze-grid')&&['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(event.key)){
   event.preventDefault();const m=game.maze,l=mazeLayout(m),[dx,dy]=({ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0]})[event.key];
   mazeMapSession=currentMazeMapSession(game,mazeMapSession);
   if(mazeMapSession?.mode==='inspect'){
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    const c=l.cells[mazeMapSession.selected],x=c.x+dx,y=c.y+dy,to=y*l.size+x;
    if(x>=0&&x<l.size&&y>=0&&y<l.size&&m.visited.includes(to))inspectMazeMapRoom(to);return;
   }
   const c=l.cells[m.position],to=(c.y+dy)*l.size+c.x+dx,a=actionsForUI(game).find(a=>a.id==='maze_step_'+to&&!a.disabledReason);
   if(a)update(chooseAction(game,a.id),undefined,{afterAdopt:()=>focusControl(null,null,'.maze-grid')});return;
  }
const t=event.target?.closest?.('[data-op]');if(!t||t.disabled||!['Enter',' '].includes(event.key)||!['hex-select','room-select','dungeon-select'].includes(t.dataset.op))return;event.preventDefault();if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;clearTimeout(spatialClickTimer);const kind=t.dataset.op==='hex-select'?'hex':t.dataset.op==='room-select'?'room':game?.rpg?.expedition?'rpg':'dungeon';inspectSpatialTarget(kind,t.dataset.id,{keyboard:true});});
root.addEventListener('input',event=>{if(event.target.isConnected===false||ironmanFenced()||practiceController.current())return;if(event.target.id==='note-text'){personalNoteDrafts.write(personalNoteScope(),event.target.value,{start:event.target.selectionStart,end:event.target.selectionEnd,direction:event.target.selectionDirection});return;}if(event.target.id==='start-age-number'){const raw=event.target.value,n=Number(raw);if(raw.trim()===''||!Number.isFinite(n)){event.target.setAttribute('aria-invalid','true');const status=root.querySelector('#age-validation');const oldest=Number(event.target.getAttribute('max'))||80;if(status)status.textContent=`Enter a whole age from 0 to ${oldest}. Your draft age is unchanged.`;return;}const oldest=Number(event.target.getAttribute('max'))||80,age=Math.max(0,Math.min(oldest,Math.round(n)));const slider=root.querySelector('#start-age');if(slider)slider.value=String(age);previewAvatar(event.target.closest('form'));const field=root.querySelector('#start-age-number');field?.focus({preventScroll:true});if(age!==n){const status=root.querySelector('#age-validation');if(status)status.textContent='Age adjusted to '+age+'. Choose a whole age from 0 to 80.';}return;}if(event.target.id==='reading-size'){displaySettings=saveDisplay({...displaySettings,scale:event.target.value},storage);applyDisplay(displaySettings);event.target.previousElementSibling.querySelector('strong').textContent=Math.round(displaySettings.scale*100)+'%';return;}if(event.target.id==='music-volume'){const a=setMusicVolume(event.target.value);const label=root.querySelector('#music-volume-label');if(label)label.textContent=`${Math.round(a.musicVolume*100)}%`;return;}if(event.target.id==='ui-sound-volume'){const a=setSoundVolume(event.target.value);const label=root.querySelector('#ui-sound-volume-label');if(label)label.textContent=`${Math.round(a.volume*100)}%`;return;}const form=event.target.closest('form');if(form?.id==='travel-plan-form'){form.dataset.dirty='true';for(const departure of root.querySelectorAll('[data-op="travel"]'))departure.disabled=true;const draft=form.querySelector('[data-road-draft]');if(draft)draft.hidden=false;return;}if(form&&form.id==='character-form')previewAvatar(form);});
root.addEventListener('focusin',event=>{if(event.target.isConnected===false||ironmanFenced()||practiceController.current())return;if(screen==='game'&&tab==='place'&&!modal){const focus=sceneFocusTarget(event.target);if(focus)sceneFocus=focus;}});
root.addEventListener('submit',async event=>{
  if(ironmanFenced()){event.preventDefault();return;}
  if(event.target.isConnected===false){event.preventDefault();return;}
  if(practiceController.current()){event.preventDefault();return;}
  practiceController.cancelPending();
  if(event.target.id==='maze-map-find'){
   event.preventDefault();if(event.target.isConnected===false)return;const id=new FormData(event.target).get('roomId');
   if(typeof id==='string'&&/^\d{1,3}$/.test(id))inspectMazeMapRoom(Number(id),{heading:true});return;
  }
  if(event.target.id==='maze-map-reminder'){
   event.preventDefault();if(!game?.maze||modal||event.target.isConnected===false)return;
   const f=new FormData(event.target),raw=f.get('identity'),room=f.get('roomId');let identity;
   try{if(typeof raw!=='string'||raw.length>2000)throw new Error();identity=JSON.parse(raw);}catch{toast('That reminder could not be read. Select the room again.');return;}
   if(typeof room!=='string'||!/^\d{1,3}$/.test(room))return;
   update(updateMazeMapMemory(game,{identity,roomId:Number(room),mark:f.get('mark')||null,note:f.get('note')}),undefined,{afterAdopt:()=>focusControl(null,null,'#maze-map-note')});return;
  }
  if(event.target.id==='personal-note-edit-form'){event.preventDefault();if(event.target.isConnected===false)return;finishPersonalNote(new FormData(event.target).get('note'));return;}
  if(event.target.id==='player-note'){event.preventDefault();if(!game||modal||event.target.isConnected===false)return;keepPersonalDraft(new FormData(event.target).get('note'));return;}
  if(event.target.id==='service-profession'){event.preventDefault();const id=new FormData(event.target).get('profession'),r=settlementServices(game).find(r=>r.id===serviceSession&&r.here);if(r&&r.kind==='work'&&typeof id==='string'&&id.startsWith('career_choose_')){const a=actionsForUI(game).find(a=>a.id===id&&!a.disabledReason);if(a){professionReview={id,service:r.id,person:r.personId,signature:JSON.stringify([game.seed,game.day,game.locationId,game.hero.gold,a])};openModal('profession-review',root.querySelector('#service-profession button'));}}return;}

  const form=event.target, f=new FormData(form);
  if(form.dataset?.crimeForm){event.preventDefault();const id=f.get('crimeAction');if(game&&typeof id==='string'&&actionsForUI(game).some(a=>a.id===id&&a.crime===form.dataset.crimeForm&&!a.disabledReason))update(chooseAction(game,id));return;}
  if(form.id==='map-find'){event.preventDefault();const key=String(f.get('place')||'');if(cartographyView(game)?.cells.some(c=>c.key===key&&(c.known!=='Unknown'||c.current))){chartSheet='country';mapCamera.forget();inspectSpatialTarget('hex',key,{keyboard:true});requestAnimationFrame(()=>{centerWorldMap(root,key);mapCamera.capture();});}return;}
  if(form.id==='craft-search'){event.preventDefault();craftSession=currentCraftSession(game,craftSession);if(!craftSession||craftSession.mode!=='craft')return;craftSession.query=String(f.get('query')||'').slice(0,100);craftSession.filter=['all',...Object.keys(SLOT_NAMES)].includes(f.get('slot'))?f.get('slot'):'all';craftSession.finish=['plain','duelist','arcanist','vanguard','wayfarer'].includes(f.get('finish'))?f.get('finish'):'plain';craftSession.selected=null;refreshSelection(null,null,{focusSelector:'#craft-query'});return;}
  if(form.id==='shop-search'){event.preventDefault();if(shopSession?.mode!=='trade'||shopAccessReason(game,shopSession?.vendor||'market'))return;shopSession.query=String(f.get('query')||'').slice(0,100);shopSession.filter=['all','equipment','supplies','materials','loot'].includes(f.get('category'))?f.get('category'):'all';refreshSelection(null,null,{focusSelector:'#shop-query'});return;}
  if(form.id==='gear-preset-save'||form.id==='gear-preset-rename'){event.preventDefault();if(!game)return;const kind=form.id==='gear-preset-save'?'save':'rename',id=f.get('preset');commitGearOrganizer({kind,id,label:f.get('label')},kind==='save'?'Current equipment saved.':'Loadout name saved.',()=>{selectedGearPreset=id;render();revealGearOrganizer();focusControl(null,null,'#gear-loadout-heading');});return;}
  if(form.id==='inventory-search'){event.preventDefault();inventoryQuery=String(f.get('query')||'').slice(0,100);inventorySort=['type','name','rarity','value','score'].includes(f.get('sort'))?f.get('sort'):'type';gearFilter=['all',...EQUIPMENT_SLOTS].includes(f.get('slot'))?f.get('slot'):'all';rememberWorkspace();refreshSelection(null,null,{focusSelector:'#inventory-query'});return;}
  if(form.id==='nearby-search'){event.preventDefault();nearbyQuery=String(f.get('query')||'').slice(0,100);nearbyPage=0;refreshSelection(null,null,{focusSelector:'#nearby-query'});return;}
  if(form.id==='people-search'){event.preventDefault();peopleQuery=String(f.get('query')||'').slice(0,100);peoplePage=0;refreshSelection(null,null,{focusSelector:'#people-query'});return;}
  if(form.id==='journal-search'){event.preventDefault();journalQuery=String(f.get('query')||'').slice(0,120);journalPages={};render();root.querySelector('#journal-query')?.focus();announceJournalResults();return;}
  if(form.id==='quest-archive-search'){event.preventDefault();questArchiveQuery=String(f.get('query')||'').slice(0,120);render();root.querySelector('#quest-archive-query')?.focus();return;}
  if(form.id==='travel-plan-form'){event.preventDefault();update(updateTravelPlan(game,{pace:f.get('pace'),supplies:f.has('supplies'),scout:f.has('scout'),escort:f.has('escort'),night:f.has('night'),routePreference:f.get('routePreference')}));return;}
  if(form.id==='romantic-identity'){event.preventDefault();update(updateRomanticIdentity(game,{gender:f.get('gender'),attraction:f.get('attraction')}));return;}
  if(form.id==='preferences-form'){event.preventDefault();update(updatePreferences(game,preferencesFromForm(f)),'Your preferences are recorded.',{afterAdopt:()=>{modal=null;render();restoreModalFocus();}});return;}
    if(form.id!=='character-form')return;
  event.preventDefault();if(screen!=='creation'||modal||creatingLife)return;captureCreation();if(creatorStep!==2){creatorStep=2;render();focusRoute('#creator-heading-2');return;}unlockAudio();
  const config=structuredClone(creatorDraft),run=++creationRun;creatingLife=true;
  const submit=root.querySelector('#character-form .begin-button');if(submit)submit.disabled=true;
  form.setAttribute?.('aria-busy','true');form.inert=true;
  for(const control of root.querySelectorAll('.creator-topline button,.creator-steps button'))control.disabled=true;
  try {
    const next=creationCandidate?.key===JSON.stringify(config)?creationCandidate.state:await createLifeAtAge(config,{shouldCancel:()=>run!==creationRun||screen!=='creation',onProgress:age=>new Promise(resolve=>requestAnimationFrame(()=>{const progress=root.querySelector('[data-creation-progress]');if(progress)progress.textContent=`Drawing your earlier years · ${age} / ${config.startAge}`;resolve();}))});
    if(next&&run===creationRun&&screen==='creation'){
      creationCandidate={key:JSON.stringify(config),state:next};
      if(config.lifeMode==='ironman'){
        const candidate={...next,ironman:createIronmanMetadata(next)};
        if(!admitLifeEntry(candidate)){creatorError='This life cannot be opened here. Your draft is kept.';return;}
        const slot=activeSlot;ironmanEntryPending=true;cancelInventoryDrag();render();
        let review;try{review=await saveStore.inspectIronman(candidate,{intent:'create',slot,acceptForPlay:positionAdmissionPolicy});}finally{ironmanEntryPending=false;}
        if(run!==creationRun||screen!=='creation')return;
        if(review.status==='review'&&admitLifeEntry(candidate)){tab='life';actionFilter='all';game=null;ironmanSession.create(slot,candidate,{token:review.token});}
        else{entryNotice='Ironman could not begin: '+title(review.reason||review.status)+'. Your existing lives are unchanged. Choose Standard explicitly or review another empty slot.';render();toast(entryNotice);}
      }else{
        const slot=activeSlot,token=creationSlotToken;
        const success=await lifeEntry.replaceReviewed({state:next,slot,token,isCurrent:()=>run===creationRun&&screen==='creation'&&activeSlot===slot&&creationSlotToken===token&&creationCandidate?.state===next});
        if(run!==creationRun||screen!=='creation')return;
        if(success===LIFE_ENTRY_CANCELLED)return;
        if(success===LIFE_ENTRY_REFUSED){creatorError='This life cannot be opened here. Your draft is kept.';render();announceView(creatorError);return;}
        if(success){creatorDirty=false;creatorUndo=null;creationCandidate=null;tab='life';actionFilter='all';game=null;adoptPosition(next,undefined,{persist:false});}
        else{creatorError=saveStore.conflict()?'This slot changed in another tab. Your draft is retained; leave this page open and review the saved-life conflict before replacing it.':'This life could not be saved in this browser. Your draft and generated life are retained on this page. Free browser space and use Begin This Life to retry this exact life.';if(saveStore.conflict()){saveConflictDismissed=false;modal='save-conflict';}render();announceView(creatorError);}
      }
    }
  }catch{if(run===creationRun&&screen==='creation'){creatorError='This life could not be drawn. Your draft is retained. Try Begin This Life again, or edit your beginning.';render();announceView(creatorError);}}
  finally{if(run===creationRun){creatingLife=false;form.inert=false;form.setAttribute?.('aria-busy','false');if(submit)submit.disabled=false;if(screen==='creation'){render();focusRoute('#creator-heading-2');}}}
});
root.addEventListener('click',async event=>{
  if(mapCamera.isDragClick(event)){event.preventDefault();return;}
  const target=event.target.closest('[data-op]'); if(!target||target.disabled||target.isConnected===false) return;
  let {op,id}=target.dataset;
  if(screen==='creation'&&creatingLife){event.preventDefault();return;}
  if(op.startsWith('ironman-')){event.preventDefault();await handleIronmanControl(op,id);return;}
  if(ironmanFenced()){event.preventDefault();return;}
  if(practiceController.current()&&event.detail>1){event.preventDefault();return;}
  if(handlePracticeClick(target,op,id)){event.preventDefault();return;}
  if(op==='practice-open'){await openPractice(id,target);return;}
  practiceController.cancelPending();
  if(op==='footing-step'){
    if(screen!=='game'||modal||!firstDayGuideVisible(game,firstDayGuideReopened))return;
    const step=firstDayGuideCommand(game,id,firstDayGuideReaders);if(!step)return;
    if(step.focus&&!step.op){const destination=firstDayGuideFocusSelectors(step.focus).flatMap(selector=>[...root.querySelectorAll(selector)]).find(node=>node.isConnected&&node.getClientRects().length);destination?.focus();return;}
    op=step.op;id=step.id;
  }
  if(op.startsWith('maze-map-')){
   if(!game?.maze||modal)return;mazeMapSession=currentMazeMapSession(game,mazeMapSession);if(!mazeMapSession)return;
   if(op==='maze-map-mode'&&['walk','inspect'].includes(id)){
    mazeMapSession={...mazeMapSession,mode:id};render();focusControl('maze-map-mode',id);
    announceView(id==='inspect'?'Inspect mode. Map selection does not walk.':'Walk mode. Adjoining room controls walk.');return;
   }
   if(op==='maze-map-select'&&mazeMapSession.mode==='inspect'&&/^\d{1,3}$/.test(id)){inspectMazeMapRoom(Number(id));return;}
   if(op==='maze-map-cancel'){
    render();focusControl('maze-map-select',String(mazeMapSession.selected),'#maze-map-selected');announceView('Unsaved reminder edits discarded.');return;
   }
   if(op==='maze-map-remove'&&mazeMapSession.mode==='inspect'&&/^\d{1,3}$/.test(id)){
    const selected=String(mazeMapSession.selected);update(updateMazeMapMemory(game,{identity:mazeMapSession.identity,roomId:Number(id),mark:null,note:''}),undefined,{afterAdopt:()=>focusControl('maze-map-select',selected,'#maze-map-selected')});return;
   }
   if(op==='maze-map-route'&&/^\d{1,3}$/.test(id)&&game.maze.mapMemory?.entries.some(row=>row.roomId===Number(id)&&row.mark)){
    mazeMapSession={...mazeMapSession,routeTarget:Number(id)};render();
    afterCurrentRender(()=>root.querySelector('#maze-route-heading')?.focus({preventScroll:true}));
    announceView(mazeRouteSummary(mazeMapView(game,actionsForUI(game),mazeMapSession)?.route));return;
   }
   if(op==='maze-map-route-clear'){
    mazeMapSession={...mazeMapSession,routeTarget:null};render();focusControl('maze-map-mode',mazeMapSession.mode);announceView('Recorded route cleared.');return;
   }
   return;
  }
  if(!['destination-select','hex-select','room-select','dungeon-select'].includes(op))clearTimeout(spatialClickTimer);
  if(['hex-select','room-select','dungeon-select'].includes(op)){clearTimeout(spatialClickTimer);const kind=op==='hex-select'?'hex':op==='room-select'?'room':game?.rpg?.expedition?'rpg':'dungeon';spatialClickTimer=setTimeout(()=>inspectSpatialTarget(kind,id),520);return;}
  unlockAudio();
  if(op==='journal-page'){
    if(!game||modal||tab!=='journal')return;
    const match=/^(life|finished|personal|offers|discoveries):(\d+)$/.exec(id);if(!match)return;
    const page=Number(match[2]);if(!Number.isSafeInteger(page))return;
    journalPages[match[1]]=page;render();focusControl(null,null,'#journal-'+match[1]+'-results');announceView(root.querySelector('#journal-'+match[1]+'-results')?.textContent||'Journal page changed.');return;
  }
  if(['personal-note-write','personal-note-back','personal-note-discard','journal-clear'].includes(op)){
    if(!game||modal||tab!=='journal')return;
    if(op==='journal-clear'){journalQuery='';journalPages={};render();focusControl(null,null,'#journal-query');announceJournalResults();return;}
    if(workspaceSection('journal',workspaceSections.journal)!=='notes')return;
    if(op==='personal-note-write')writePersonalNote();
    else if(op==='personal-note-back')returnToDiscoveries();
    else if(personalNoteDrafts.discard(personalNoteScope())){refreshNoteDraft(personalNoteScope(),{focus:true});announceView('This life’s unsubmitted draft was discarded. Kept notes are unchanged.');}
    return;
  }
  if(op==='herbal-care-confirm'){
    if(!game||modal!=='herbal-care'||!herbalCareReview||event.detail>1)return;
    const fresh=herbalCareQuote(game),review=herbalCareReview;
    if(review.scope!==personalNoteScope()){closeModal();toast('This life changed. Review its care again.');return;}
    if(review.source!==game||JSON.stringify(fresh)!==JSON.stringify(review.quote)){
      herbalCareReview={source:game,scope:personalNoteScope(),quote:fresh};render();focusControl(null,null,'#herbal-care-heading');announceView('Your position changed. Review the current care offer before confirming.');return;
    }
    if(fresh.disabledReason){toast(fresh.disabledReason);return;}
    target.disabled=true;
    const result=update(useConsumable(game,'herbs'),undefined,{afterAdopt:()=>{herbalCareReview=null;modal=null;render();restoreModalFocus();}});
    if(!result){target.disabled=false;toast('The care could not be accepted. Your review is still open.');}return;
  }
  if(op==='personal-notes-scope'){
    if(!game||modal||tab!=='journal'||!['current','archived','family'].includes(id))return;
    personalNotesScope=id;journalPages.personal=0;refreshSelection(op,id);return;
  }
  if(op==='personal-note-edit'||op==='personal-note-archive'){
    if(!game||modal||tab!=='journal'||workspaceSection('journal',workspaceSections.journal)!=='notes')return;
    const note=personalNoteRows(game).find(n=>n.key===id&&n.own),review=reviewPersonalNote(game,id);if(!note||!review||op==='personal-note-edit'&&note.archived)return;
    pendingPersonalNote={scope:personalNoteScope(),note,review,mode:op==='personal-note-edit'?'edit':'archive'};openModal('personal-note',target);return;
  }
  if(op==='personal-note-confirm'){if(pendingPersonalNote?.mode==='archive')finishPersonalNote();return;}
  if(op==='download-game'){void downloadGame();return;}
  if(op==='cancel-game-download'){cancelGameDownload();return;}
  if(op.startsWith('title-')||op.startsWith('slot-')||op.startsWith('creator-'))playUISound('click');
  if(op==='music-toggle'){const a=setMusicEnabled(!getAudioSettings().musicEnabled);target.textContent=`♫ Music ${a.musicEnabled?'on':'off'}`;target.setAttribute('aria-pressed',String(a.musicEnabled));return;}
  if(op==='fullscreen'){try{if(document.fullscreenElement)document.exitFullscreen()?.catch(()=>{});else document.documentElement.requestFullscreen()?.catch(()=>toast('Fullscreen is unavailable here.'));}catch{toast('Fullscreen is unavailable here.');}return;}
  if(op==='review-save-conflict'){openModal('save-conflict',target);return;}
  if(op==='reload-conflicted-life'){
    const slot=activeSlot,position=game,incoming=pendingImport,importing=Boolean(incoming);target.disabled=true;
    return refreshSavedLives(()=>{
      modal=null;focusReturn=null;game=null;saved=null;pendingImport=null;pendingDeletion=null;notificationToasts=[];clearTimeout(notificationTimer);
      if(!importing&&saveStore.read(slot)){
        const opened=loadSlot(slot);
        if(opened!==false)return opened;
      }
      // The user explicitly discarded the old session. A refused fresh life
      // must leave a rendered save list, including from a title-screen dialog.
      activeSlot=saveStore.active();screen='slots';slotsMode='load';entryNotice='The saved-life list is reloaded. No life was replaced or restored.';render();
    },{discardSession:true,shouldContinue:()=>target.isConnected&&modal==='save-conflict'&&activeSlot===slot&&game===position&&pendingImport===incoming});
  }
  if(activeSaveConflict()&&['title-load','title-new','title-continue','confirm-new','slot-load','slot-new'].includes(op)){openModal('save-conflict',target);return;}
  if(op==='title-menu'){showTitle();return;}
  if(op==='title-settings'){screen='settings';render();focusRoute('.settings-screen h1,.menu-screen h1');return;}
  if(op==='title-load'){return refreshSavedLives(()=>{screen='slots';slotsMode='load';entryNotice='';render();focusRoute('.save-slots-screen h1,.menu-screen h1');});}
  if(op==='title-new'||op==='confirm-new'){return refreshSavedLives(()=>{screen='slots';slotsMode='new';modal=null;entryNotice='';render();focusRoute('.save-slots-screen h1,.menu-screen h1');});}
  if(op==='title-continue'){
    const slot=Number(id);
    // Returning to an unsaved Standard session is navigation only. A failed
    // lock may have prevented even the store's in-memory write from running.
    // Keep the exact previewed live position; Ironman always uses authority.
    if(screen==='title'&&game&&slot===activeSlot&&!isIronman(game)&&saveStore.hasUnsavedChanges(slot,game)){
      if(!admitLifeEntry(game))return;
      screen='game';modal=null;render();focusRoute('#main-content h1,#main-content h2');return;
    }
    return refreshSavedLives(()=>{if(Number.isInteger(slot)&&slot>=0&&slot<3&&saveStore.read(slot))return loadSlot(slot);screen='slots';slotsMode='load';entryNotice='That life is no longer in its slot. Choose a saved life below.';render();focusRoute('#slot-heading');});
  }
  if(op==='slot-delete'){const life=occupantOf(id);if(!life)return;if(isIronman(life)){await reviewIronmanLifecycle(runIdOf(life));return;}pendingDeletion={id:Number(id),token:saveStore.deletionToken(id),name:life.hero.name,backupName:(saveStore.backup(id)||saveStore.keptBackup(id))?.hero.name};openModal('delete-life',target);return;}
  if(op==='confirm-delete-life'){
    if(!pendingDeletion)return;
    const choice=pendingDeletion;
    target.disabled=true;
    const removed=await saveOperation(()=>pendingDeletion===choice&&modal==='delete-life'?saveStore.remove(choice.id,{reviewed:true,token:choice.token}):'cancelled');
    if(removed==='cancelled')return;
    if(!removed){pendingDeletion=null;modal=null;entryNotice='The saved life changed or could not be deleted. It remains saved. Reload this page before trying again.';render();return;}
    if(activeSlot===choice.id){game=null;activeSlot=saveStore.active();saved=saveStore.read(activeSlot);shopSession=null;serviceSession=null;mapCamera.forget();}
    pendingDeletion=null;modal=null;focusReturn=null;screen='slots';entryNotice=choice.name+' was deleted from this browser.';render();root.querySelector('[data-op="slot-load"]:not(:disabled),[data-op="title-menu"]')?.focus({preventScroll:true});return;
  }
  if(op==='slot-load'){return refreshSavedLives(()=>loadSlot(id));}
  if(op==='slot-new'){if(isIronman(saveStore.read(Number(id)))){toast('Archive or delete this Ironman position before using its slot.');return;}if(occupantOf(id)){overwriteSlot=Number(id);openModal('overwrite',target);}else beginCreator(id);return;}
  if(op==='confirm-overwrite'){beginCreator(overwriteSlot);return;}
  if(op==='export-slot'){const state=saveStore.read(Number(id)),kept=state?null:saveStore.kept(id);if(kept){if(isIronman(kept))await exportKeptIronman(kept,Number(id));else downloadState(kept);return;}exportState(state);return;}
  if(op==='export-kept'){const kept=saveStore.kept(id);if(kept){if(isIronman(kept))await exportKeptIronman(kept,Number(id));else downloadState(kept);}return;}
  if(op==='export-pending'){if(pendingImport&&importFromBackup&&refusedHere(pendingImport))downloadState(pendingImport);return;}
  if(op==='export-session'){exportState(Number(id)===activeSlot&&game?game:saveStore.read(Number(id)));return;}
  if(op==='attributes-training'){modal=null;focusReturn=null;workspaceSections.character='training';navigate('character');focusRoute('#main-content h2');return;}
  if(op==='creator-slots'){captureCreation();openModal('creator-slots',target);return;}
  if(op==='creator-use-slot'){if(modal!=='creator-slots'||occupantOf(id))return;activeSlot=Number(id);saveStore.select(activeSlot);saved=null;creationSlotToken=saveStore.reviewToken(activeSlot);creatorError='';closeModal();focusRoute('#creator-heading-2');return;}
  if(op==='creator-discard'){creatorDirty=false;creatorUndo=null;creationCandidate=null;creatorError='';modal=null;if(creatorLeaveTo==='slots'){screen='slots';slotsMode='new';render();focusRoute('#slot-heading');}else showTitle({discardDraft:true});return;}
  if(op==='creator-back'&&creatorStep===0){requestCreatorLeave('slots');return;}
  if(op==='creator-step'||op==='creator-back'){if(creatingLife)return;captureCreation();creatorStep=op==='creator-back'?Math.max(0,creatorStep-1):Math.max(0,Math.min(2,Number(id)));render();focusRoute('#creator-heading-'+creatorStep);return;}
  if(op==='creator-settings'){captureCreation();openModal('settings',target);return;}
  if(op==='creator-portraits'){if(creatingLife)return;captureCreation();openModal('portraits',target);return;}
  if(op==='creator-undo'){if(creatingLife)return;if(creatorUndo){const prior=creatorUndo;creatorUndo=null;creatorDraft=prior;creatorDirty=JSON.stringify(prior)!==creatorBaseline;creationCandidate=null;creatorNotice='Latest change undone. The previous draft, including its fate, is restored.';creatorError='';render();focusRoute('#creator-heading-'+creatorStep);announceView(creatorNotice);}return;}
  if(op==='creator-lock'){captureCreation();adoptCreatorDraft(toggleCreatorLock(creatorDraft,id),{message:'Randomization lock updated.'});render();focusControl(op,id);return;}
  if(op==='creator-random-portrait'){captureCreation();adoptCreatorDraft(randomizeCreatorPortrait(creatorDraft),{message:'Only the portrait changed. Your beginning, pronouns, family and name remain in the draft.'});render();focusControl(op,id);return;}
  if(op==='gallery-stage'){if(modal!=='portraits')return;portraitGalleryState={...portraitGalleryState,stage:id,page:0,previewKey:null,message:'Browsing a portrait stage does not change your character’s age or selection.'};render();focusControl(op,id);return;}
  if(op==='gallery-page'){portraitGalleryState.page=Number(id);render();requestAnimationFrame(()=>root.querySelector('.portrait-gallery-grid .portrait-choice:not(:disabled)')?.focus({preventScroll:true}));return;}
  if(op==='gallery-locked'){portraitGalleryState.showLocked=!portraitGalleryState.showLocked;portraitGalleryState.page=0;render();focusControl(op,id);return;}
  if(op==='gallery-preview'){if(modal!=='portraits')return;portraitGalleryState.previewKey=id;portraitGalleryState.message='Preview only. Your selection has not changed.';render();focusRoute('#portrait-preview-heading');return;}
  if(op==='gallery-cancel-preview'){const key=portraitGalleryState.previewKey;portraitGalleryState.previewKey=null;render();focusControl('gallery-preview',key,'.portrait-gallery-count');return;}
  if(op==='gallery-clear'){portraitGalleryState={...portraitGalleryState,page:0,presentation:'all',archetype:'all',stage:null,previewKey:null,showLocked:false,message:'Filters cleared. Your portrait is unchanged.'};render();focusControl(op,undefined);return;}
  if(op==='gallery-current'){portraitGalleryState.heritage=null;const c=galleryContext();portraitGalleryState=findCurrentPortrait(c.person,{age:c.age});render();focusRoute('.portrait-gallery-count');announceView(portraitGalleryState.message);return;}
  if(op==='gallery-select'){
    if(modal!=='portraits'||id!==portraitGalleryState.previewKey||event.detail>1)return;
    if(screen==='creation'){let next=portraitGalleryState.heritage?selectCreatorHeritage(creatorDraft,portraitGalleryState.heritage):creatorDraft;adoptCreatorDraft(selectCreatorPortrait(next,id));closeModal();}
    else if(game){const next=portraitGalleryState.heritage?declareCharacterHeritage(game,portraitGalleryState.heritage):game;update(selectCharacterPortrait(next,id),undefined,{afterAdopt:()=>closeModal()});}
    return;
  }
  if(op==='gallery-heritage'){if(modal!=='portraits')return;portraitGalleryState={...portraitGalleryState,heritage:id,page:0,previewKey:null,message:'Browsing this heritage. Confirm a portrait to apply it.'};render();focusControl(op,id);return;}
  if(op==='creator-origin'){if(creatingLife)return;captureCreation();adoptCreatorDraft(selectCreatorOrigin(creatorDraft,id));refreshSelection(op,id);return;}
  if(op==='creator-name'){if(creatingLife)return;captureCreation();adoptCreatorDraft(rollCreatorName(creatorDraft));render();focusControl(op,id);return;}
  if(op==='creator-trait'){captureCreation();adoptCreatorDraft(toggleCreatorTrait(creatorDraft,id));modal=null;render();focusControl('trait-picker','0','.personality-builder h3');return;}
  if(op==='creator-attribute'){if(screen!=='creation'||creatingLife)return;captureCreation();const [key,amount]=id.split(':');adoptCreatorDraft(adjustCreatorAttribute(creatorDraft,key,Number(amount)));refreshSelection(op,id);return;}
  if(op==='trait-picker'){if(screen==='creation')captureCreation();openModal('traits',target);return;}
  if(op==='personality-trait'){modal=null;update(choosePersonalityTrait(game,id));return;}
  if(op==='creator-random'){if(creatingLife)return;captureCreation();const changed=adoptCreatorDraft(randomizeCreatorDraft(creatorDraft));if(!changed)creatorNotice='No choices changed. All choices are locked.';render();focusControl(op,id);announceView(creatorNotice);return;}
  if(op==='reading-preset'){if(!['book','clear','quiet'].includes(id))return;displaySettings=saveDisplay(displayPreset(id),storage);applyDisplay(displaySettings);render();focusControl('reading-preset',id);announceView('Reading preset applied.');return;}
  if(op==='reading-reset'){displaySettings=saveDisplay({...displaySettings,scale:1,font:'serif'},storage);applyDisplay(displaySettings);render();focusControl(op,id);announceView('Text size and font reset. Other settings are unchanged.');return;}
  if(op==='sound-toggle'||op==='notification-sound'){const a=setSoundEnabled(!getAudioSettings().enabled);if(a.enabled)playUISound(op==='notification-sound'?'notification':'click');if(op==='notification-sound'){render();focusControl(op,'');}else{target.textContent=a.enabled?'Sound on':'Sound off';target.setAttribute('aria-pressed',String(a.enabled));}return;}
  if(!['age-up','live-season','continue-age','choice','reply','travel','battle-finish','battle-action','activity','equip','recruit','toggle-companion','continue-year','continue-child'].includes(op))playUISound('click');
  if(op==='scene-return'){returnToScene();return;}
  if(op==='tab'){navigate(id);return;}
  if(op==='menu'){openModal('menu',target);return;}
  if(op==='help'){openModal('help',target);return;}
  if(op==='game-settings'){openModal('settings',target);return;}
  if(op==='routine-review'){if(!game)return;const [actionId,count]=id.split(':'),review=routineReview(game,actionId,Number(count),{getActions,getLifeCommitment});if(!review||modal)return;routineReviewState={state:game,review};openModal('routine-review',target);return;}
  if(op==='routine-confirm'){const q=routineReviewState;if(modal!=='routine-review'||!q||q.state!==game||event.detail>1)return;const result=executeRoutine(game,q.review,{getActions,getLifeCommitment,chooseAction});if(result.state===game){closeModal();toast(result.reason);return;}routineReviewState=null;target.disabled=true;update(result.state,undefined,{afterAdopt:()=>{modal=null;workspaceSections.life='present';tab='life';render();focusRoute('.latest-result summary,#main-content h1,#main-content h2');}});return;}
  if(op==='project-abandon-confirm'){const q=projectAbandonReview,a=actionsForUI(game).find(a=>a.id==='workshop_cancel'&&!a.disabledReason);if(modal!=='project-abandon'||!q||q.state!==game||q.snapshot!==JSON.stringify(game.workshop?.project)||!a||event.detail>1){closeModal();toast('This project changed. Review its current work before abandoning it.');return;}projectAbandonReview=null;target.disabled=true;update(chooseAction(game,'workshop_cancel'),undefined,{afterAdopt:()=>{modal=null;render();if(craftSession)focusControl(null,null,'#craft-heading');else restoreModalFocus();announceView(conciseOutcome(game.notice));}});return;}
  if(op==='close-modal'){closeModal();return;}
  if(op==='recover-current'){focusReturn=null;if(activeSaveConflict()){openModal('save-conflict',target);return;}dispatchSlotLoad(loadSlot(activeSlot));return;}
  if(op==='resume'){if(isIronman(saved))ironmanSession.resume(runIdOf(saved),activeSlot);else if(saved){if(!admitLifeEntry(saved)||!leaveIronman())return;tab='life';update(structuredClone(saved));}return;}
  if(op==='random-seed'){creationSeed=randomSeed();creatorDraft.seed=creationSeed;const input=root.querySelector('[name="seed"]');if(input)input.value=creationSeed;return;}
  if(op==='new'){openModal('new',target);return;}
  if(op==='import'){importOpener={dataset:{op:target.dataset.op,id:target.dataset.id}};root.querySelector('#save-file').click();return;}
  if(op==='export'){exportSave();return;}
  if(op==='confirm-import'&&pendingImport&&isIronman(pendingImport)){if(!importToken||!admitLifeEntry(pendingImport))return;const incoming=pendingImport,slot=importSlot;ironmanSession.import(slot,incoming,{token:importToken,message:'The reviewed Ironman position is saved.',afterAdopt:()=>{pendingImport=null;importToken=null;modal=null;}});return;}
  if(op==='confirm-import'&&pendingImport){
    const incoming=pendingImport,slot=importSlot,token=importToken,owner=viewOwner();
    if(!admitLifeEntry(incoming))return;
    target.disabled=true;
    const imported=await lifeEntry.replaceReviewed({state:incoming,slot,token,isCurrent:()=>pendingImport===incoming&&modal==='import-review'&&importSlot===slot&&importToken===token});
    if(!ownsView(owner)||imported===LIFE_ENTRY_CANCELLED)return;
    if(imported===LIFE_ENTRY_REFUSED){target.disabled=false;admitLifeEntry(incoming);return;}
    if(!imported){storageAvailable=saveStore.available();if(saveStore.conflict()){saveConflictDismissed=false;openModal('save-conflict',target);}else{render();toast('The import could not be saved. Export a backup or free browser space; your previous life remains safe.');}return;}
    if(!leaveIronman())return;
    activeSlot=slot;pendingImport=null;modal=null;resetGearOrganizerView();journalScope=null;pendingPersonalNote=null;mazeMapSession=null;game=null;tab='life';workspaceReturn=null;selectedHex=null;update(incoming,'The reviewed import is saved.');return;
  }
  if(!game) return;
  if(op==='footing-open'){if(game.phase==='retired')return;firstDayGuideReopened=true;workspaceSections.life='present';modal=null;focusReturn=null;navigate('life');const guide=root.querySelector('.first-day-guide');if(guide)guide.open=true;disclosureStates.set('life:first-day-guide',true);focusControl(null,null,'#first-day-guide-heading');return;}
  if(op==='footing-dismiss'){
    if(modal||!firstDayGuideVisible(game,firstDayGuideReopened))return;
    // Help may reopen an already dismissed guide. Closing that UI is not a
    // gameplay transition, failed action, or another persistence request.
    const alreadyDismissed=game.hero.firstDayGuide?.dismissed===true;
    const finish=()=>{firstDayGuideReopened=false;render();focusControl(null,null,['.life-current','.battle-command-panel','.workspace-body']);};
    if(alreadyDismissed){finish();toast('Guide hidden.');}else update(dismissFirstDayGuide(game),'Guide hidden.',{afterAdopt:finish});
    return;
  }
  if(op==='notifications'){openModal('inbox',target);return;}
  if(op==='notice-dismiss'){notificationToasts=notificationToasts.filter(n=>n.id!==id);render();return;}
  if(op==='inbox-page'){const page=Number(id);if(!Number.isSafeInteger(page)||page<0||page>=Math.max(1,Math.ceil(notificationsFor(game).length/20)))return;inboxPage=page;selectedNotice=null;render();focusRoute('#inbox-title');return;}
  if(op==='notice-open'||op==='notification-toast-open'){
    if(!notificationsFor(game).some(n=>n.id===id))return;
    const selection=op==='notice-open'&&selectedNotice===id?null:id;
    const next=markNotificationsRead(game,id);if(!validateSave(next))return;
    const show=()=>{inboxPage=Math.floor(notificationsFor(game).findIndex(n=>n.id===id)/20);selectedNotice=selection;notificationToasts=notificationToasts.filter(n=>n.id!==id);if(op==='notification-toast-open')openModal('inbox',root.querySelector('[data-op="notifications"]'));else{render();focusControl('notice-open',id);}};
    // Reading the already retained words is immediate. Only the read receipt
    // awaits Ironman's normal exclusive authority check; gameplay stays fenced.
    show();
    if(next===game)return;
    const finish=()=>{inboxReadPending=null;render();focusControl('notice-open',id);};
    if(isIronman(game)){inboxReadPending={state:game,runId:runIdOf(game)};update(next,undefined,{afterAdopt:finish});if(!keepsInboxVisible())inboxReadPending=null;}else{game=next;save();finish();}return;
  }
  if(op==='notice-read-all'){const next=markNotificationsRead(game);if(next===game||!validateSave(next))return;const finish=()=>{inboxReadPending=null;render();focusControl(null,null,'#inbox-title');};if(isIronman(game)){inboxReadPending={state:game,runId:runIdOf(game)};update(next,undefined,{afterAdopt:finish});if(!keepsInboxVisible())inboxReadPending=null;}else{game=next;save();finish();}return;}
  if(op==='notice-recovery'||op==='notice-inventory'){modal=null;focusReturn=null;if(op==='notice-recovery')activitiesPane='recovery';navigate(op==='notice-recovery'?'activities':'inventory');return;}
  if(op==='notice-person'){
    const person=peopleRecordPage(game,{scope:'all',selectedId:id}).people.find(p=>p.id===id)||getContacts(game).find(p=>p.id===id);if(!person)return;
    const locationId=game.conversations?.meetings?.[id]?.locationId||person.locationId;
    selectedLocation=game.cartography?.sites?.[locationId]?locationId:null;selectedHex=null;modal=null;focusReturn=null;serviceSession=null;workspaceReturn=null;navigate('map');focusRoute('#spatial-selection-title,#main-content h1,#main-content h2,.workspace-body');if(!selectedLocation)toast('Their recorded home has no charted route yet.');return;
  }

  if(op==='workspace-open'){const split=id.indexOf(':'),route=id.slice(0,split),section=id.slice(split+1);if(!WORKSPACE_SECTIONS[route]?.some(([key])=>key===section))return;workspaceSections[route]=section;navigate(route);return;}
  if(op==='workspace-section'){const split=id.indexOf(':'),route=id.slice(0,split),section=id.slice(split+1);if(route!==tab||!WORKSPACE_SECTIONS[route]?.some(([key])=>key===section))return;if(route==='journal'&&farmView(game)){const errands=root.querySelector('.farm-errands');if(errands)errands.open=true;disclosureStates.set('journal:farm-errands',true);}workspaceSections[route]=section;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='nearby-page'){const page=Number(id);if(!Number.isSafeInteger(page)||page<0||page>=Math.max(1,Math.ceil(nearbyContacts(game).filter(p=>!nearbyQuery.trim()||(p.name+' '+p.role).toLowerCase().includes(nearbyQuery.trim().toLowerCase())).length/8)))return;nearbyPage=page;refreshSelection(op,id,{focusSelector:'#nearby-people-heading'});return;}
  if(op==='map-expand'){if(game&&tab==='map')openModal('map',target);return;}
  if(op.startsWith('craft-')&&['craft-browse','craft-conversation','craft-category','craft-item','craft-confirm','craft-continue'].includes(op)){
    const artisan=settlementServices(game).find(r=>r.id===serviceSession&&r.kind==='smith'&&r.here);if(!artisan||target.isConnected===false)return;
    if(op==='craft-browse'){craftSession=newCraftSession(game,artisan);shopSession=null;refreshSelection(null,null,{focusSelector:'#craft-heading'});return;}
    craftSession=currentCraftSession(game,craftSession);if(!craftSession||craftSession.mode!=='craft')return;
    if(op==='craft-conversation'){craftSession=null;refreshSelection(null,null,{focusSelector:'#meeting-speaker'});return;}
    if(op==='craft-category'){if(!CRAFTING_TABS.some(([key])=>key===id))return;craftSession.category=id;craftSession.selected=null;craftSession.filter='all';craftSession.query='';refreshSelection(null,null,{focusSelector:'#craft-heading'});return;}
    if(op==='craft-clear'){const session=currentCraftSession(game,craftSession);if(!session)return;craftSession={...session,query:'',filter:'all',selected:null,quote:null};render();focusControl(null,null,'#craft-query');announceView('Search and slot filter cleared. Category and finish are unchanged.');return;}
  if(op==='craft-item'){if(!craftRows(game,actionsForUI(game),craftSession).some(a=>a.id===id))return;craftSession.selected=id;refreshSelection(null,null,{focusSelector:'#craft-item-heading'});return;}
    if(op==='craft-confirm'){const actions=actionsForUI(game);if(id!==craftSession.selected||!craftSession.quote||craftSession.quote!==craftQuote(game,actions,craftSession))return;const a=actions.find(a=>a.id===id&&!a.disabledReason);if(!a)return;const before=game;update(chooseAction(game,id),undefined,{afterAdopt:()=>{if(craftSession)craftSession.quote=null;if(game.event||game.battle||game.conversations?.pending)return;render();if(!game.event&&!game.battle&&!game.conversations?.pending&&game.locationId===before.locationId)focusControl(null,null,['#craft-item-heading','#craft-heading']);}});return;}
    if(op==='craft-continue'){if(id==='workshop_cancel'){reviewProjectAbandonment(target);return;}if(!['workshop_continue','workshop_cancel'].includes(id)||!actionsForUI(game).some(a=>a.id===id&&!a.disabledReason))return;const before=game;update(chooseAction(game,id),undefined,{afterAdopt:()=>{if(craftSession)craftSession.selected=null;if(game.event||game.battle||game.conversations?.pending)return;render();if(!game.event&&!game.battle&&!game.conversations?.pending&&game.locationId===before.locationId)focusControl(null,null,'#craft-heading');}});return;}
  }
  if(op==='inn-browse'){const r=settlementServices(game).find(r=>r.id===serviceSession&&r.kind==='inn'&&r.here);if(!r||shopAccessReason(game,'inn'))return;shopSession={...newTradeDraft(game,'inn'),mode:'trade',draft:newTradeDraft(game,'inn')};refreshSelection(null,null,{focusSelector:'#trade-heading'});return;}
  if(op.startsWith('shop-')){
    shopSession=currentShopSession(game,shopSession);if(!shopSession)return;if(!['shop-leave','shop-conversation','shop-terms'].includes(op)&&shopAccessReason(game,shopSession.vendor||'market'))return;
    if(op==='shop-browse'){shopSession.mode='trade';shopSession.draft=newTradeDraft(game,shopSession.vendor||'market');shopSession.selected=null;refreshSelection(null,null,{focusSelector:'#trade-heading'});return;}
    if(op==='shop-terms'){shopSession.mode='terms';refreshSelection(null,null,{focusSelector:'#shop-speaker, #meeting-speaker'});return;}
    if(op==='shop-leave'){sceneReturn=null;sceneFocus=null;const person=serviceSession;shopSession=null;serviceSession=null;refreshSelection('service-open',person,{focusSelector:'#place-area-heading'});return;}
    if(op==='shop-conversation'){shopSession.mode='dialogue';shopSession.draft=null;refreshSelection(null,null,{focusSelector:'#shop-speaker, #meeting-speaker'});return;}
    if(shopSession.mode!=='trade')return;
    if(op==='shop-item'){shopSession.selected=id;refreshSelection(null,null,{focusSelector:'#trade-item-heading'});return;}
    if(op==='shop-clear'){shopSession.draft=newTradeDraft(game,shopSession.vendor||'market');refreshSelection(null,null,{focusSelector:'#trade-heading'});return;}
    if(op==='shop-add'||op==='shop-remove'){const split=id.indexOf(':'),side=id.slice(0,split),key=id.slice(split+1);if(!['buy','sell'].includes(side))return;const row=tradeInventory(game,shopSession.vendor||'market')[side].find(i=>i.id===key);if(!row||row.disabledReason)return;if(shopSession.vendor==='materials'&&side==='buy'&&op==='shop-add')shopSession.draft.buy=shopSession.draft.buy.filter(i=>i.id===key);const list=shopSession.draft[side],old=list.find(i=>i.id===key),n=(old?.quantity||0)+(op==='shop-add'?1:-1);if(n<0||n>row.quantity)return;shopSession.draft[side]=list.filter(i=>i.id!==key);if(n)shopSession.draft[side].push({id:key,quantity:n});refreshSelection(null,null,{focusSelector:'#trade-item-heading, #trade-heading'});return;}
    if(op==='shop-confirm'){const quote=shopSession.quote;if(!quote||quote.disabledReason)return;const before=game;update(completeTrade(game,quote),undefined,{afterAdopt:()=>{if(shopSession){shopSession.draft=newTradeDraft(game,shopSession.vendor||'market');shopSession.selected=null;}render();if(!game.event&&!game.battle&&!game.conversations?.pending&&game.locationId===before.locationId)focusControl(null,null,'#trade-heading');}});return;}
    return;
  }
  if(op==='place-open'){serviceSession=null;modal=null;shopSession=null;selectedContact=null;selectedRoom=null;nearbyPage=0;nearbyQuery='';tab='place';workspaceReturn=null;rememberWorkspace();render();requestAnimationFrame(()=>root.querySelector('.place-heading h1, .dungeon-heading h1, #main-content h2')?.focus({preventScroll:true}));return;}
  if(op==='place-area'){const path=settlementWalkPath(game,id);if(!path)return;let next=game;for(const room of path){const a=getActions(next).find(a=>a.id==='atlas_room_'+room&&!a.disabledReason);if(!a)break;next=chooseAction(next,a.id);if(next.event||next.battle||next.conversations?.pending)break;}const finish=()=>{serviceSession=null;if(id!=='market')shopSession=null;selectedContact=null;selectedRoom=null;if(!game.event&&!game.battle&&!game.conversations?.pending)tab='place';workspaceReturn=null;render();focusControl(null,null,'#place-area-heading');};if(next!==game)update(next,undefined,{afterAdopt:finish});else finish();return;}
  if(op==='spatial-mode'){if(!['country','settlement','dungeon'].includes(id))return;selectedContact=null;selectedRoom=null;nearbyPage=0;nearbyQuery='';tab=id==='country'?'map':id==='dungeon'?'life':'place';workspaceReturn=null;rememberWorkspace();render();return;}
  if(op==='spatial-pane'){if(!['map','actions'].includes(id))return;spatialPane=id;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='spatial-contact'){serviceSession=null;if(!nearbyContacts(game).some(p=>p.id===id))return;selectedContact=id;selectedRoom=null;spatialMode='settlement';spatialPane='actions';tab='place';workspaceReturn=null;rememberWorkspace();render();requestAnimationFrame(()=>root.querySelector('.dialogue-speaker h2')?.focus({preventScroll:true}));return;}
  if(op==='spatial-back'){sceneReturn=null;sceneFocus=null;serviceSession=null;selectedContact=null;rememberWorkspace();render();requestAnimationFrame(()=>{const residents=root.querySelector('.place-residents');if(residents)residents.open=true;root.querySelector('#nearby-people-heading, .dialogue-speaker h2')?.focus({preventScroll:true});});return;}
  if(op==='nearby-circle'){nearbyPage=0;nearbyQuery='';selectedContact=null;spatialMode='settlement';spatialPane='actions';tab='map';render();return;}
  if(op==='activity-route'){selectDestination(id,{center:true});return;}
  if(op==='activity-home'){const reason=homeRestReason(game,{visiting:true});if(reason){toast(reason);return;}const path=settlementWalkPath(game,'homes');if(!path){toast('Your home cannot be reached from here.');return;}let next=game;for(const room of path){const a=getActions(next).find(a=>a.id==='atlas_room_'+room&&!a.disabledReason);if(!a){toast('Resolve the current moment first.');return;}next=chooseAction(next,a.id);}const rest=getActions(next).find(a=>a.id==='home_rest'&&!a.disabledReason);if(!rest){toast('You cannot rest at home right now.');return;}update(chooseAction(next,rest.id),undefined,{afterAdopt:()=>{serviceSession=null;selectedContact=null;shopSession=null;if(!game.event&&!game.battle&&!game.conversations?.pending)tab='place';workspaceReturn=null;render();focusControl(null,null,'#place-area-heading');}});return;}
  if(op==='activity-visit'||op==='activity-school'){const [serviceId,schoolAction]=op==='activity-school'?id.split('|'):[id,null];const target=settlementServices(game).find(r=>r.id===serviceId);if(!target)return;const path=settlementWalkPath(game,target.roomId);if(!path){toast('Walk to this settlement before visiting.');return;}let next=game;for(const room of path){const a=getActions(next).find(a=>a.id==='atlas_room_'+room&&!a.disabledReason);if(!a){toast('Resolve the current moment first.');return;}next=chooseAction(next,a.id);}const actual=settlementServices(next).find(r=>r.id===serviceId&&r.here);if(!actual)return;next=visitService(next,serviceId);if(schoolAction&&['school_attend','grow_read','study'].includes(schoolAction)){const a=getActions(next).find(a=>a.id===schoolAction&&!a.disabledReason);if(a)next=chooseAction(next,schoolAction);}update(next,undefined,{afterAdopt:()=>{serviceSession=serviceId;serviceTopic=null;selectedContact=null;craftSession=null;shopSession=actual.kind==='materials'?{...newTradeDraft(game,'materials'),mode:'dialogue'}:null;if(!game.event&&!game.battle&&!game.conversations?.pending)tab='place';workspaceReturn=null;render();focusControl(null,null,'.service-meeting h1');}});return;}
  if(op==='service-open'){const r=settlementServices(game).find(r=>r.id===id&&r.here);if(!r)return;update(visitService(game,id),undefined,{afterAdopt:()=>{serviceSession=id;serviceTopic=null;selectedContact=null;craftSession=null;shopSession=['merchant','materials'].includes(r.kind)?{...newTradeDraft(game,r.kind==='materials'?'materials':r.subjectId),mode:'dialogue'}:null;render();focusControl(null,null,'.service-meeting h1');}});return;}
  if(op==='service-topic'){const r=settlementServices(game).find(r=>r.id===serviceSession&&r.here);if(!r||!(r.kind==='work'&&['commissions','work'].includes(id)||r.kind==='inn'&&['repertoire','inn'].includes(id))||game.event||game.battle||game.conversations?.pending||game.timeline?.journey)return;serviceTopic=['commissions','repertoire'].includes(id)?id:null;refreshSelection(null,null,{focusSelector:'#meeting-speaker'});return;}
  if(op==='service-close'){sceneReturn=null;sceneFocus=null;craftSession=null;serviceSession=null;serviceTopic=null;shopSession=null;refreshSelection('service-open',id,{focusSelector:'#place-area-heading'});return;}
  if(op==='tournament-care'){tab='activities';activitiesPane='recovery';workspaceReturn=null;refreshSelection('activities-pane','recovery');return;}
  if(op==='use-consumable'){if(id==='herbs')openHerbalCare(target);else update(useConsumable(game,id));return;}
  if(op==='inventory-remedies'){if(!game||modal)return;inventoryFavoritesOnly=false;inventoryCategory='supplies';gearFilter='all';inventoryQuery='';inventoryItem=game.hero.potions>0?'supply:potions':game.flags.herbs>0?'supply:herbs':null;navigate('inventory');afterCurrentRender(()=>root.querySelector('#inventory-item-heading,#inventory-query')?.focus({preventScroll:true}));return;}
  if(op==='receipt-gear'){const selection=expeditionGearSelection(game,id);if(!selection)return;inventoryFavoritesOnly=false;inventoryItem=selection.selectedId;inventoryCategory=selection.category;gearFilter=selection.filter;inventoryQuery=selection.query;navigate(selection.tab);requestAnimationFrame(()=>{const comparison=root.querySelector('.inventory-comparison');if(comparison)comparison.open=true;root.querySelector('#inventory-item-heading')?.focus({preventScroll:true});});return;}
  if(op==='field-potion'){const quote=fieldPotionQuote(game,id);if(quote.disabledReason){toast(quote.disabledReason);return;}update(useConsumable(game,'potions',id));return;}
  if(op==='inventory-item'){if(!inventoryEntries(game).some(r=>r.id===id))return;inventoryItem=id;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='inventory-favorites'){inventoryFavoritesOnly=!inventoryFavoritesOnly;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='gear-favorite'){commitGearOrganizer({kind:'favorite',id},'Favorite bookmark updated.');return;}
  if(op==='gear-preset-preview'){if(!gearPreset(game,id))return;selectedGearPreset=id;revealGearOrganizer();refreshSelection(op,id,{focusSelector:'#gear-loadout-heading'});return;}
  if(op==='gear-preset-apply'){commitGearOrganizer({kind:'apply',id},'Saved equipment applied for the next encounter.');return;}
  if(op==='gear-preset-replace'||op==='gear-preset-delete'){const preset=gearPreset(game,id);if(!preset)return;gearPresetReview={kind:op==='gear-preset-replace'?'replace':'delete',id,expected:gearPresetFingerprint(preset),lifeKey:gearOrganizerLifeKey()};openModal('gear-preset-review',target);return;}
  if(op==='gear-preset-confirm'){const review=gearPresetReview;if(modal!=='gear-preset-review'||!review||review.id!==id||review.lifeKey!==gearOrganizerLifeKey()){toast('That loadout review is no longer current.');return;}commitGearOrganizer(review,review.kind==='replace'?'Saved arrangement replaced.':'Saved arrangement deleted.',()=>{if(review.kind==='delete'&&selectedGearPreset===id)selectedGearPreset=null;gearPresetReview=null;modal=null;render();focusControl(null,null,'#gear-loadout-heading');});return;}
  if(op==='inventory-category'){if(!['all','equipment','supplies','materials','loot'].includes(id))return;inventoryCategory=id;gearFilter='all';rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='people-clear'){peopleQuery='';peoplePage=0;refreshSelection(null,null,{focusSelector:'#people-query'});return;}
  if(op==='people-scope'){if(!['close','household','party','recent','family','lovers','friends','acquaintances','rivals','enemies','all','circle','nearby'].includes(id))return;peopleScope=id==='circle'?'family':id==='nearby'?'all':id;peoplePage=0;refreshSelection(op,id);return;}
  if(op==='people-page'){if(!Number.isSafeInteger(Number(id)))return;peoplePage=Math.max(0,Number(id));refreshSelection(op,id,{focusSelector:'#people-results-heading'});return;}
  if(op==='journal-category'){if(!['all','main','side','misc','radiant','commitments'].includes(id))return;journalCategory=id;journalPages={};refreshSelection(op,id);announceJournalResults();return;}
  if(op==='quest-category'){if(!['main','side','misc','radiant','archive'].includes(id))return;questCategory=id;refreshSelection(op,id);return;}
  if(op==='quest-invitations'){if(!['preview','all','declined'].includes(id))return;questInvitations=id;refreshSelection(op,id);return;}
  if(op==='gear-slot'){if(!EQUIPMENT_SLOTS.includes(id))return;inventoryFavoritesOnly=false;gearFilter=id;inventoryCategory='equipment';inventoryQuery='';rememberWorkspace();refreshSelection(op,id,{focusSelector:'#inventory-slot'});return;}
  if(op==='people-pane'){if(!['conversations','bonds','society'].includes(id))return;peoplePane=id;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='build-goal'){if(id!=='none'&&!BUILD_GOALS.some(g=>g.id===id))return;packGoal=id;rememberWorkspace();render();focusControl(op,id);return;}
  if(op==='pack-pane'){if(!['equipment','bag','merchant','craft','relics'].includes(id))return;packPane=id;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='activities-pane'){if(!ACTIVITY_TABS.some(r=>r[0]===id))return;activitiesPane=id;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='continue-child'){update(continueAsChild(game,id));return;}
  if(op==='blood-need'){update(attendBloodHunger(game));return;}
  if(op==='age-up'){update(ageUp(game));return;}
  if(op==='live-season'){update(liveSeason(game));return;}
  if(op==='continue-age'){update(continueAgeUp(game));return;}
  if(op==='person-place'){const person=peopleRecordPage(game,{scope:'all',selectedId:id}).people.find(p=>p.id===id)||getContacts(game).find(p=>p.id===id);if(!person)return;const locationId=game.conversations?.meetings?.[id]?.locationId||person.locationId;selectedLocation=game.cartography?.sites?.[locationId]?locationId:null;selectedHex=null;spatialMode='country';spatialPane='actions';tab='map';rememberWorkspace();render();requestAnimationFrame(()=>root.querySelector('#spatial-selection-title')?.focus({preventScroll:true}));if(!selectedLocation)toast('Their recorded home has no charted route yet. Ask at a known settlement for leads.');return;}
  if(op==='contact'){if(!peopleRecordPage(game,{scope:'all'}).people.some(p=>p.id===id))return;selectedContact=id;rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='reply'){
    const personId=target.dataset.person,pending=game.conversations?.pending,sequence=game.conversations?.sequence;
    const choice=pending?.personId===personId&&['levy_reaction','levy_household','levy_return'].includes(pending.nodeId)?pending.snapshot?.choices.find(c=>c.id===id):null;
    update(replyMessage(game,personId,id),undefined,{afterAdopt:()=>{
    selectedContact=personId;
    if(choice){
      const answered=game,messages=game.conversations?.threads?.[personId]?.slice(-2);
      // A cancelled or stale exchange adds no speech. Only a real reply may
      // reveal its new answer instead of restoring the old lower button row.
      if(!game.conversations.pending&&game.conversations.sequence===sequence+2&&messages?.length===2&&messages[0].id===`letter-${sequence+1}`&&messages[0].speaker==='hero'&&messages[0].text===choice.text&&messages[1].id===`letter-${sequence+2}`&&messages[1].speaker===personId&&messages[1].text===choice.response)afterCurrentRender(()=>{
        if(screen!=='game'||modal||game!==answered||selectedContact!==personId)return;
        const panel=[...root.querySelectorAll('.dialogue-scene')].find(n=>n.dataset.contactId===personId&&n.isConnected&&n.getClientRects().length),answer=panel?.querySelector('.dialogue-window'),scroller=answer?.closest('.game-content');
        if(!answer||!scroller)return;
        answer.focus({preventScroll:true});
        scroller.scrollTop+=answer.getBoundingClientRect().top-scroller.getBoundingClientRect().top-(parseFloat(getComputedStyle(scroller).scrollPaddingTop)||0);
      });
    }
    }});return;
  }
  if(op==='hex-select'){inspectSpatialTarget('hex',id);return;}
  if(op==='spatial-move'){const split=id.indexOf(':'),kind=id.slice(0,split);if(split<0||!['hex','room','dungeon','rpg'].includes(kind))return;moveSpatialTarget(kind,id.slice(split+1));return;}
  if(op==='restore-backup'){pendingImport=saveStore.backup(Number(id))||keptOldBackup(Number(id));importFromBackup=Boolean(pendingImport);if(pendingImport){importSlot=Number(id);importToken=isIronman(pendingImport)?null:saveStore.reviewToken(importSlot);openModal('import-review',target);if(isIronman(pendingImport))await inspectIronmanImport();}return;}
  if(op==='map-select'){if(!game.cartography?.sites[id])return;spatialMode='country';spatialPane='actions';tab='map';selectedHex=null;selectedLocation=id;render();focusControl(op,id);rememberWorkspace();return;}
  if(op==='night-location'){const r=nightDiscoveryView(game).invitations.find(r=>r.id===id);if(r){spatialMode='country';spatialPane='map';selectedHex=r.hex;selectedLocation=r.locationId;tab='map';render();window.scrollTo({top:0,behavior:'instant'});}return;}
  if(op==='quest-location'){spatialMode='country';selectedHex=null;selectedLocation=id;tab='map';render();window.scrollTo({top:0,behavior:'instant'});focusRoute('#spatial-selection-title,#main-content h1,#main-content h2,.workspace-body');return;}
  if(op==='destination-select'){selectDestination(id);return;}
  if(op==='journey-current'){selectedLocation=game.timeline?.journey?.destinationId||game.cartography?.route?.destination||game.locationId;selectedHex=null;render();rememberWorkspace();mapCamera.forget();requestAnimationFrame(()=>{centerWorldMap(root);mapCamera.capture();focusControl('journey-current','');});return;}
  if(op==='journey-show'){selectedLocation=game.timeline?.journey?.destinationId||game.cartography?.route?.destination||game.locationId;selectedHex=null;render();rememberWorkspace();requestAnimationFrame(()=>root.querySelector('#spatial-selection-title')?.focus({preventScroll:true}));return;}
  if(op==='journey-familiar'){update(continueFamiliarJourney(game));return;}
  if(op==='journey-continue'){update(continueExploreJourney(game));return;}
  if(op==='journey-stop'){const location=game.locationId;update(stopExploreJourney(game),undefined,{afterAdopt:()=>{selectedLocation=location;selectedHex=null;render();}});return;}
  if(op==='map-grid'){chartGrid=!chartGrid;rememberWorkspace();refreshSelection(null,null,{focusSelector:'[data-op="map-grid"]'});return;}
  if(op==='map-zoom'){zoomChart(id);return;}
  if(op==='customize'){openModal('appearance',target);return;}
  if(op==='portraits'){openModal('portraits',target);return;}
  if(op==='preferences'){openModal('preferences',target);return;}
  if(op==='craft-finish'){if(!['plain','duelist','arcanist','vanguard','wayfarer'].includes(id))return;craftFinish=id;render();focusControl(op,id);return;}
  if(op==='economy-goal'){if(!ECONOMY_GOALS.some(g=>g.id===id))return;economyGoal=id;render();focusControl(op,id);return;}
  if(op==='economy-merchant'){selectedContact=null;navigate('place');return;}
  if(op==='gear-filter'){if(id!=='all'&&!EQUIPMENT_SLOTS.includes(id))return;gearFilter=id;packPane='bag';rememberWorkspace();refreshSelection(op,id);return;}
  if(op==='show-contact'){if(!getContacts(game).some(p=>p.id===id)&&game.conversations?.pending?.personId!==id)return;selectedContact=id;if(nearbyContacts(game).some(p=>p.id===id)){spatialMode='settlement';spatialPane='actions';selectedRoom=null;tab='place';workspaceReturn=null;}else if(game.conversations?.pending?.personId===id){workspaceSections.life='present';tab='life';}else{const records=peopleRecordPage(game,{scope:'all',focusId:id});if(!records.people.some(p=>p.id===id)){toast('Meet this person before opening a relationship record.');return;}peopleScope='all';peopleQuery='';peoplePage=records.page;tab='relationships';}rememberWorkspace();render();requestAnimationFrame(()=>root.querySelector('.dialogue-speaker h2, .person-memory h1, #main-content h2')?.focus({preventScroll:true}));return;}
  if(op==='continue-year'){update(continueYear(game));return;}
  if(op==='equip'){update(equipGear(game,id));return;}
  if(op==='save'){if(isIronman(game)){await ironmanSession.refresh();return;}const owner=viewOwner(),success=await save();if(ownsView(owner)&&!saveStore.conflict())toast(success?'Your life is saved in this browser.':'Storage unavailable. Export your life to keep it.');return;}
  if(op==='filter'){actionFilter=id;refreshSelection(op,id);return;}
  if(op==='choice'){update(chooseEventOption(game,id));return;}
  if(op==='home-family'){peopleScope='family';peopleQuery='';peoplePage=0;selectedContact=null;navigate('relationships');return;}
  if(op==='runestone-resume'){focusRoute('#runestone-title');root.querySelector('#runestone-title')?.scrollIntoView?.({block:'center'});return;}
  if(op==='activity'){
    if(id==='workshop_cancel'){reviewProjectAbandonment(target);return;}
    if(/^fun_pairs$|^fun_pair_\d+$|^fun_pairs_finish$/.test(id)){
      if(modal||event.detail>1||!actionsForUI(game).some(a=>a.id===id&&!a.disabledReason))return;
      const after=id.startsWith('fun_pair_')?Number(id.slice(9)):-1;
      update(chooseAction(game,id),undefined,{afterAdopt:()=>{const g=game.socialLife?.game,i=nextRunestone(g,after);if(i!==null)focusControl('activity','fun_pair_'+i);else focusRoute(g?'#runestone-status':'.latest-result summary, #main-content h1');announceView(g?runestoneStatus(g):game.notice);}});return;
    }
    if(id==='health_herbs'){openHerbalCare(target);return;}
    if(id.startsWith('maze_assist_')){const a=actionsForUI(game).find(a=>a.id===id);if(modal||!target.isConnected||event.detail>1||!a||a.disabledReason){if(a?.disabledReason)toast(a.disabledReason);return;}update(chooseAction(game,id),undefined,{afterAdopt:()=>focusControl(null,null,'#maze-field-assists-title')});return;}
    if(modal==='map'){modal=null;focusReturn=null;}
    if(id.startsWith('talk_')){const ordinary=getContacts(game).some(p=>p.id===id.slice(5)),levy=!ordinary&&/^talk_levy_(?:household|return)_([a-z][a-z0-9_-]{0,79})$/.exec(id),personId=levy?levy[1]:id.startsWith('talk_quest_')?id.slice(11):id.slice(5);if(!nearbyContacts(game).some(p=>p.id===personId)){selectedContact=personId;tab='relationships';render();toast('Visit this person’s actual settlement to speak with them.');return;}selectedContact=personId;tab='place';workspaceReturn=null;spatialMode='settlement';spatialPane='actions';selectedRoom=null;}

    if(id.startsWith('life_home_')){const a=actionsForUI(game).find(a=>a.id===id);if(!a||a.disabledReason){toast(a?.disabledReason||'This home is no longer available.');return;}homePurchaseReview={...homePurchasePreview(game,id.slice(10)),disabledReason:a.disabledReason};openModal('home-purchase',target);return;}
    if(id.startsWith('school_enroll_')&&game.education?.enrolled&&game.education.route!==id.slice(14)){schoolTransferReview=educationTransferPreview(game,id.slice(14));if(schoolTransferReview){openModal('school-transfer',target);return;}}
    update(chooseAction(game,id));return;
  }
  if(op==='profession-confirm'){
    const q=professionReview,a=actionsForUI(game).find(a=>a.id===id&&!a.disabledReason),r=q&&settlementServices(game).find(r=>r.id===q.service&&r.personId===q.person&&r.here&&r.kind==='work');
    if(modal!=='profession-review'||!q||q.id!==id||!a||!r||event.detail>1)return;
    if(q.signature!==JSON.stringify([game.seed,game.day,game.locationId,game.hero.gold,a])){professionReview=null;closeModal();toast('The trade offer changed. Review it again.');return;}
    update(chooseAction(game,id),undefined,{afterAdopt:()=>{professionReview=null;closeModal();}});return;
  }
  if(op==='home-purchase-confirm'){
    if(modal!=='home-purchase'||!homePurchaseReview||homePurchaseReview.tier!==id||!target.isConnected||event.detail>1)return;
    const fresh=homePurchasePreview(game,id),a=actionsForUI(game).find(a=>a.id===fresh?.actionId);
    if(!fresh||!a||a.disabledReason||fresh.disabledReason){toast(a?.disabledReason||fresh?.disabledReason||'This home is no longer available.');return;}
    if(fresh.signature!==homePurchaseReview.signature){homePurchaseReview=fresh;render();toast('The home details changed. Review them before confirming.');return;}
    const next=chooseAction(game,fresh.actionId);update(next,undefined,{afterAdopt:()=>{homePurchaseReview=null;modal=null;render();}});return;
  }
  if(op==='school-transfer-confirm'){
    if(modal!=='school-transfer'||!schoolTransferReview||schoolTransferReview.to!==id)return;
    const fresh=educationTransferPreview(game,id),a=actionsForUI(game).find(a=>a.id===fresh?.actionId);
    if(!fresh||!a||a.disabledReason){toast(a?.disabledReason||'Finish the waiting moment before transferring.');return;}
    if(fresh.signature!==schoolTransferReview.signature){schoolTransferReview=fresh;render();toast('The course preview changed. Review its current terms before confirming.');return;}
    const next=chooseAction(game,fresh.actionId);update(next,undefined,{afterAdopt:()=>{schoolTransferReview=null;modal=null;render();}});return;
  }
  if(op==='travel'){if(modal||!target.isConnected||event.detail>1)return;if(root.querySelector('#travel-plan-form')?.dataset.dirty==='true'){toast('Save the changed road preparations to refresh their quote first.');return;}update(startExploreJourney(game,id),undefined,{afterAdopt:()=>{selectedLocation=id;selectedHex=null;mapCamera.forget();render();afterCurrentRender(()=>{centerWorldMap(root);mapCamera.capture();});}});return;}
  if(op==='recruit'){update(recruitCompanion(game,id));return;}
  if(op==='toggle-companion'){update(toggleCompanion(game,id));return;}
  if(op==='battle-finish'){update(resolveBattle(game,game.battle));return;}
  if(op==='battle-action'){
    const action=getBattleActions(game.battle).find(a=>a.id===id);
    const allyTarget=action?.targetSide==='party'?selectedAllyTarget:undefined;
    update(chooseBattleAction(game,id,allyTarget||selectedTarget));return;
  }
});
root.addEventListener('change',async event=>{
  if(event.target.isConnected===false||ironmanFenced())return;
  const practice=practiceController.current();
  if(practice){
    const token=event.target.dataset?.practiceSession;
    if(modal!=='practice'||token!==practice.id)return;
    const side=event.target.name===practice.id+'-enemy-target'?'enemy':event.target.name===practice.id+'-ally-target'?'party':null;
    if(side&&practiceController.select(token,side,event.target.value)){render();focusPractice(`[name="${practice.id}-${side==='party'?'ally':'enemy'}-target"][value="${event.target.value}"]`);}
    return;
  }
  practiceController.cancelPending();
  if(event.target.id==='journey-destination'){selectDestination(event.target.value,{center:true,fromPicker:true});return;}
  if(event.target.id==='chart-sheet'){const id=event.target.value;if(!paperMapSheets(game,{view:cartographyView(game)}).some(s=>s.id===id))return;chartSheet=id;mapScale=1;rememberWorkspace();refreshSelection(null,null,{focusSelector:'#chart-sheet'});mapCamera.forget();requestAnimationFrame(()=>{const viewport=root.querySelector('[data-map-viewport]');if(viewport){viewport.scrollLeft=0;viewport.scrollTop=0;}mapCamera.capture();});return;}
  if(event.target.id==='inventory-sort'){if(!['type','name','rarity','value','score'].includes(event.target.value))return;inventorySort=event.target.value;rememberWorkspace();refreshSelection(null,null,{focusSelector:'#inventory-sort'});return;}
  if(event.target.id==='inventory-slot'){if(!['all',...EQUIPMENT_SLOTS].includes(event.target.value))return;gearFilter=event.target.value;rememberWorkspace();refreshSelection(null,null,{focusSelector:'#inventory-slot'});return;}
  if(['presentation','archetype'].includes(event.target.dataset?.galleryFilter)){
    const filter=event.target.dataset.galleryFilter;portraitGalleryState[filter]=event.target.value;portraitGalleryState.page=0;render();
    requestAnimationFrame(()=>root.querySelector(`[data-gallery-filter="${filter}"]`)?.focus({preventScroll:true}));return;
  }
  if(event.target.name==='import-slot'){importSlot=Number(event.target.value);importToken=isIronman(pendingImport)?null:saveStore.reviewToken(importSlot);if(isIronman(pendingImport)){await inspectIronmanImport();return;}render();requestAnimationFrame(()=>root.querySelector(`[name="import-slot"][value="${importSlot}"]`)?.focus({preventScroll:true}));return;}
  if(event.target.id==='reading-motion'){displaySettings=saveDisplay({...displaySettings,reducedMotion:event.target.checked},storage);applyDisplay(displaySettings);return;}
  if(event.target.id==='reading-numbers'){displaySettings=saveDisplay({...displaySettings,showNumbers:event.target.checked},storage);render();return;}
  if(event.target.id==='single-key-shortcuts'){displaySettings=saveDisplay({...displaySettings,singleKeyShortcuts:event.target.checked},storage);announceView('Single-key shortcuts '+(displaySettings.singleKeyShortcuts?'enabled.':'disabled.'));return;}
  if(event.target.id==='reading-font'){displaySettings=saveDisplay({...displaySettings,font:event.target.value},storage);applyDisplay(displaySettings);return;}
  const form=event.target.closest('form');
  if(form&&form.id==='character-form'){previewAvatar(form);if(['ancestry','identity','heritageChoice','lifeMode'].includes(event.target.name)){const name=event.target.name;render();root.querySelector(`[name="${name}"]`)?.focus({preventScroll:true});}return;}
  if(event.target.name==='battle-ally-target'){selectedAllyTarget=event.target.value;render();requestAnimationFrame(()=>root.querySelector(`[name="battle-ally-target"][value="${selectedAllyTarget}"]`)?.focus({preventScroll:true}));return;}
  if(event.target.name==='battle-target'){selectedTarget=event.target.value;render();requestAnimationFrame(()=>root.querySelector(`[name="battle-target"][value="${selectedTarget}"]`)?.focus({preventScroll:true}));return;}
  if(event.target.id!=='save-file'||!event.target.files[0]) return;
  const input=event.target,file=input.files[0],request=++importReadRun,origin=practiceContext(),originEpoch=ironmanSession.status().epoch,owner=viewOwner();
  const stillCurrent=()=>{const current=practiceContext();return ownsView(owner)&&originEpoch===ironmanSession.status().epoch&&!ironmanFenced()&&request===importReadRun&&input.isConnected!==false&&input.files?.[0]===file&&!practiceController.current()&&!practiceController.pending()&&Object.keys(origin).every(key=>origin[key]===current[key]);};
  if(file.size>MAX_SAVE_FILE_BYTES){toast('That file is too large for a saved life.');focusReturn=importOpener?.dataset;importOpener=null;restoreModalFocus();return;}
  try {const text=await file.text();if(!stillCurrent())return;const parsed=JSON.parse(text),state=readStoredLife(parsed)??(oldRules(parsed)&&keepable(parsed)?parsed:null);if(!state)throw new Error('Invalid');if(!stillCurrent())return;pendingImport=state;importFromBackup=false;importSlot=saveStore.empty()??activeSlot;importToken=isIronman(state)?null:saveStore.reviewToken(importSlot);openModal('import-review',importOpener);importOpener=null;if(isIronman(state)&&!refusedHere(state))await inspectIronmanImport();}
  catch {if(stillCurrent()){toast('This is not a compatible Hearth & Oath save. Your current life is safe.');focusReturn=importOpener?.dataset;importOpener=null;restoreModalFocus();}}
});

function randomSeed(){const n=new Uint32Array(3);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(n);else for(let i=0;i<n.length;i++)n[i]=Math.floor(Math.random()*4294967296);const a=['ember','moss','winter','river','thorn','bell','hollow','salt','cinder','reed','glass','raven'],b=['covenant','lantern','vale','hearth','root','tide','haven','march','reach','grove','barrow','fen'];return `${a[n[0]%a.length]}-${b[n[1]%b.length]}-${n[2].toString(16).padStart(8,'0')}`;}
render();

root.addEventListener('click',event=>{if(!ironmanFenced()&&modal&&event.target.classList.contains('modal-overlay'))closeModal();});
document.addEventListener('fullscreenchange',()=>{for(const control of root.querySelectorAll('[data-op="fullscreen"]'))control.textContent=fullscreenLabel();});
root.addEventListener('cancel',event=>{if(event.target.id==='save-file'){focusReturn=importOpener?.dataset;importOpener=null;restoreModalFocus();}},true);
document.addEventListener('keydown',event=>{
  if(ironmanFenced())return;
  const practice=practiceController.current();
  if(practice&&event.key!=='Tab'){
    if(event.repeat&&['Enter',' '].includes(event.key)){event.preventDefault();return;}
    if(event.key==='Escape'){event.preventDefault();closePractice(practice.id);}
    return;
  }
  if(!modal){
    if(event.key==='Escape'&&screen==='game'){event.preventDefault();openModal('menu',root.querySelector('[data-op="menu"]'));return;}
    if(event.key==='Escape'&&screen!=='title'){event.preventDefault();showTitle();return;}
    if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable||event.ctrlKey||event.metaKey||event.altKey)return;
    if(displaySettings.singleKeyShortcuts&&!event.repeat&&screen==='game'&&['l','m','p','i','j'].includes(event.key.toLowerCase())){event.preventDefault();navigate({l:'life',m:'map',p:'relationships',i:'inventory',j:'journal'}[event.key.toLowerCase()]);return;}
    if(screen==='title'&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){const buttons=[...root.querySelectorAll('.title-menu-item:not(:disabled)')],index=buttons.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:index<0?(event.key==='ArrowDown'?0:buttons.length-1):(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();event.preventDefault();return;}
    if(displaySettings.singleKeyShortcuts&&!event.repeat&&screen==='game'&&/^[1-9]$/.test(event.key)){const choices=[...root.querySelectorAll(game.conversations?.pending?'[data-op="reply"]':'[data-op="choice"]')].filter(el=>el.getClientRects().length);const choice=choices[Number(event.key)-1];if(choice&&!choice.disabled){event.preventDefault();choice.click();}}
    return;
  }
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(event.key!=='Tab')return;
  const focusable=[...root.querySelectorAll('.modal button:not(:disabled), .modal a[href], .modal input:not(:disabled), .modal select:not(:disabled), .modal textarea:not(:disabled), .modal [tabindex="0"]')].filter(el=>el.getClientRects().length);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});

// Storage notifications warn; only the explicit reload control adopts another
// tab's position, so a live unsaved story never disappears behind the player.
window.addEventListener?.('storage',event=>{
  const relevant=isIronmanStorageKey(event.key)||[SAVE_KEY,'hearth-and-oath:slots:v1'].includes(event.key);
  if(!relevant)return;
  const prefix=[IRONMAN_RECORD_PREFIX,IRONMAN_ENDED_PREFIX].find(prefix=>typeof event.key==='string'&&event.key.startsWith(prefix)),hint=prefix?event.key.slice(prefix.length):null;
  const runIds=[validIronmanRunId(hint)?hint:null,runIdOf(sceneReturn?.game),runIdOf(game),runIdOf(saved),runIdOf(pendingImport),runIdOf(practiceController.current()?.origin?.life),runIdOf(firstDayGuideSource),ironmanReview?.runId,ironmanSession.status().runId,...(ironmanRecoveries||[]).map(row=>row.runId)];
  ironmanReviewSequence++;ironmanReview=null;cancelInventoryDrag();clearTimeout(spatialClickTimer);
  if(ironmanSession.status().runId||isIronman(game)){
    ironmanSession.invalidate('storage-change');
    void ironmanSession.settled().then(()=>ironmanSession.refresh()).then(()=>fanoutIronmanMarkers(runIds)).then(()=>render());
  }else{const displayedSaved=runIdOf(saved);void fanoutIronmanMarkers(runIds).then(()=>{if(!game&&screen==='title'&&displayedSaved&&!saved)render();});}
  if(event.key==='hearth-and-oath:slots:v1'&&game&&!isIronman(game))saveOperation(()=>saveStore.checkForConflict(activeSlot),()=>{reflectSaveStatus();return true;});
});

// Only actual unsaved choices prompt on exit. Conflict bookkeeping alone or
// an unchanged failed re-save is not a new choice. This also covers a live
// position still waiting for its coordinated write, before unsaved is filled.
window.addEventListener?.('beforeunload',event=>{
  if(!personalNoteDrafts.hasUnsubmitted()&&!(screen==='creation'&&creatorDirty)&&!ironmanEntryPending&&!ironmanSession.status().busy&&!ironmanSession.status().unresolved&&!saveStore.hasUnsavedChanges()&&!(game&&!isIronman(game)&&saveStore.hasUnsavedChanges(activeSlot,game)))return;
  event.preventDefault();event.returnValue='';
});
