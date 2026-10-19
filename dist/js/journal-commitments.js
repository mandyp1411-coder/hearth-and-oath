import { personalStoryState, undertakingStatusLabel } from './undertaking-contract.js';
import { tournamentScore } from './adult-tournament-state.js';
import { tournamentAvailabilityReason } from './adult-tournament.js';
import { researchJournalRows } from './research-runtime.js';
import { firstMissionJournalRow } from './faction-first-missions.js';
import { countingTableJournalRows } from './counting-table-job.js';
import { originJournalRows } from './family-origins.js';
import { fellowshipCompanionLocation } from './fellowship.js';
import { getContacts } from './conversations.js';
import { educationTeacher } from './household.js';
import { classView } from './classes.js';
import { storyView } from './life-stories.js';
import { questReturnForecast } from './quest-records.js';
import { REGIONAL_STORIES_V27 } from './regional-stories-v27.js';
import { RPG_FACTIONS_V27, regionalAnchor } from './rpg-depth-v27.js';
import { settlementServices, serviceAccepts } from './world-services.js';

const location = (s, id) => s.world.locations.find(p => p.id === id);
const open = p => p && !['destroyed', 'evacuated'].includes(p.status) && p.servicesAvailable !== false;
const materials = value => Object.entries(value || {}).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${id}`).join(', ') || 'No personal materials';
const projectFor = (s, kind, id) => s.rpg?.project?.kind === kind && s.rpg.project.id === id ? s.rpg.project : null;
const dateStatus = (s, dueDay) => s.day >= dueDay ? 'Ready to revisit' : `Returns on day ${dueDay} · ${dueDay - s.day} days away`;
const projectDetail = p => `${p.completedDays}/${p.totalDays} actual days kept · ${p.remainingDays} remain. ${p.paid ? 'The agreed fee has already been paid.' : `The recorded ${p.cost} Gold fee is not yet paid.`}`;

/** A read model, never a second task ledger. Merely eligible/read offers are not commitments. */
export function journalCommitments(s) {
  const rows = [...researchJournalRows(s),...originJournalRows(s),...countingTableJournalRows(s)], commission = s.careers?.active, project = s.stories?.project;
  const tournament=s.adultTournament;
  if(tournament&&['preparing','ready','paused','bout'].includes(tournament.stage)){
    const q=tournamentScore(tournament),reason=tournamentAvailabilityReason(s);
    rows.push({key:'watchhouse:'+tournament.id,kind:'tournament',commitment:true,title:'The Watchhouse Challenge'+(tournament.stage==='paused'?' · Suspended':''),personName:tournament.host.name,personId:tournament.host.id,exactPerson:true,providerKind:'watch',providerOnly:true,roomId:'watch',locationId:tournament.locationId,status:tournament.stage==='paused'?'paused':'active',objective:reason||'Continue the same finite local card, or stop without an extra day or fine.',details:[`${q.wins} wins, ${q.losses} losses, ${q.played}/3 played bouts. Preparation: ${tournament.paidDays}/1 actual day attended; never charged twice.`, 'Normal care, supplies and travel retain their own costs. No invented replacement or walkover result.'],actionId:tournament.stage==='paused'?'tournament_resume':tournament.stage==='preparing'?'tournament_prepare':'tournament_bout_'+tournament.results.length,cancelId:'tournament_withdraw'});
  }
  if (commission && ['accepted', 'ready'].includes(commission.status)) {
    rows.push({
      key: 'commission:' + commission.id, kind: 'commission', commitment: true,
      title: 'Commission: ' + commission.goodName, personName: commission.customerName,
      locationId: commission.locationId, status: commission.status, dueDay: commission.dueDay,
      objective: commission.status === 'ready' ? 'Show the finished work to a Work Steward and agree the invoice.' : 'Visit a Work Steward to choose how to make the agreed work.',
      details: [
        `Client: ${commission.customerName} · ${commission.profession}.`,
        commission.status === 'ready' ? `Work completed · quality ${commission.quality}/${commission.targetQuality}. Materials have already been consumed.` : `Agreed materials: ${materials(commission.materials)} · ${commission.days} standard work days · requested quality ${commission.targetQuality}.`,
        `Due day ${commission.dueDay} · ${commission.late || s.day > commission.dueDay ? 'Deadline missed; the saved late-payment terms apply.' : `${commission.dueDay - s.day} days remain.`} Base payment ${commission.pay} Gold; the final invoice uses the actual quality and agreed terms.`,
      ],
      actionId: commission.status === 'ready' ? 'career_invoice' : 'career_make_standard',
      providerKind: 'work', providerOnly: true,
    });
  }
  const returns = new Map(questReturnForecast(s).map(row => [row.id, row]));
  for (const arc of storyView(s)?.arcs || []) {
    if (!['active', 'paused'].includes(arc.status)) continue;
    const progress = project?.arcId === arc.id ? project : null, forecast = returns.get(arc.id);
    rows.push({
      key: 'story:' + arc.id, kind: 'personal', commitment: true, title: arc.title,
      personName: arc.personName, locationId: arc.locationId, status: personalStoryState(arc,project),
      dueDay: forecast?.dueDay, paused: arc.status === 'paused',
      objective: progress ? 'Continue the chapter under its saved agreement, or withdraw from its remaining work.' : arc.status === 'paused' ? 'Paused. Your earlier choices and return date remain recorded.' : forecast ? forecast.ready ? 'The next chapter is ready to revisit when you choose.' : `Returns at age ${arc.nextAge}; no new work has been accepted.` : 'The opening proposal is saved; choose its terms when you are ready.',
      details: [
        `${arc.chapter}/${arc.totalChapters} chapters completed.`,
        ...(forecast ? [`Return at age ${forecast.nextAge} · day ${forecast.dueDay}${forecast.ready ? ' · ready to revisit' : ` · ${forecast.dueDay - s.day} days away`}.`, `Last choice: ${forecast.lastChoice}`] : []),
        ...(progress ? [projectDetail(progress)] : []),
      ],
      actionId: progress ? 'stories_continue' : 'stories_open_' + arc.id,
      actionLabel: progress ? 'Continue agreed work' : 'Read the next proposal',
      ...(progress ? { cancelId: 'stories_cancel' } : { pauseId: `journal_${arc.status === 'paused' ? 'resume' : 'pause'}_story:${arc.id}` }),
    });
  }
  for (const arc of s.rpg?.arcs || []) {
    const progress = projectFor(s, 'regional', arc.id), definition = REGIONAL_STORIES_V27.find(d => d.id === arc.id);
    // Opening a regional scene creates an active shell, even when the player leaves.
    if (!definition || arc.status !== 'active' || !arc.choices.length && !progress) continue;
    const displaced = !open(location(s, arc.locationId)), destination = displaced ? regionalAnchor(s, definition.regionId)?.id : arc.locationId;
    rows.push({
      key: 'regional:' + arc.id, kind: 'regional-story', commitment: true, title: definition.title,
      personName: arc.cast.speaker?.name, locationId: destination, status: 'active', dueDay: arc.nextDay,
      objective: progress ? 'Continue the regional work under its saved agreement.' : displaced ? 'Find the displaced account at a surviving hearth. Earlier choices remain unchanged.' : `Next: ${definition.chapters[arc.chapter]?.title || 'The recorded next chapter'}.`,
      details: [`${arc.chapter}/${definition.chapters.length} chapters completed.`, ...(progress ? [projectDetail(progress)] : [dateStatus(s, arc.nextDay)]), ...(arc.choices.length ? ['Last choice: ' + (arc.choices.at(-1).label || arc.choices.at(-1).id)] : [])],
      actionId: progress ? 'rpg_continue' : `rpg_${displaced ? 'relocate' : 'regional'}_${arc.id}`,
      actionLabel: progress ? 'Continue agreed work' : displaced ? 'Carry the account forward' : 'Read the next chapter',
      ...(progress ? { cancelId: 'rpg_cancel', actionDays: progress.remainingDays, actionCost: progress.paid ? 0 : progress.cost } : { providerKind: 'guide' }),
    });
  }
  for (const faction of s.rpg?.factions || []) {
    if (faction.firstMission?.status === 'active') { rows.push(firstMissionJournalRow(s, faction)); continue; }
    const progress = projectFor(s, 'faction', faction.id), definition = RPG_FACTIONS_V27.find(d => d.id === faction.id);
    // rpg_join means “A faction heard”; rank zero alone is explicitly not acceptance.
    if (!definition || faction.rank >= definition.missions.length || !faction.choices.length && !progress) continue;
    const local = settlementServices(s).find(r => r.kind === 'faction' && r.subjectId === faction.id);
    const destination = progress?.locationId || local?.locationId || regionalAnchor(s, definition.regionId)?.id;
    rows.push({
      key: 'faction:' + faction.id, kind: 'faction-return', commitment: true, title: definition.name,
      locationId: destination, status: 'active', dueDay: faction.nextDay,
      objective: progress ? 'Continue the faction work under its saved agreement.' : `Next agreement: ${definition.missions[faction.rank]}`,
      details: [`${faction.rank}/${definition.missions.length} agreements completed.`, ...(progress ? [projectDetail(progress)] : [dateStatus(s, faction.nextDay)]), ...(faction.choices.length ? ['Last agreement: ' + faction.choices.at(-1).outcome] : [])],
      actionId: progress ? 'rpg_continue' : 'rpg_faction_' + faction.id,
      actionLabel: progress ? 'Continue agreed work' : 'Read the next agreement',
      ...(progress ? { cancelId: 'rpg_cancel', actionDays: progress.remainingDays, actionCost: progress.paid ? 0 : progress.cost } : { providerKind: 'faction', subjectId: faction.id }),
    });
  }
  const trial=s.flags?.legacyMentorTrial;
  if(trial&&!['offer','recognized','withdrawn'].includes(trial.stage)){
    const current=classView(s).callings.find(c=>c.id===trial.classId)?.mentor,needs=trial.supervisor.id!==current?.id,next=trial.stage==='completed'?'recognize':needs?'handover':'continue';
    rows.push({key:'accepted-legacy-trial',kind:'calling-trial',commitment:true,title:'Accepted '+trial.classId+' initiation',personName:trial.mentor.name,locationId:current?.locationId||trial.supervisor.locationId,status:'active',objective:trial.stage==='completed'?'The completed trial record awaits explicit administrative recognition; no combat or work needs repeating.':needs?'A new supervisor must be explicitly agreed before unfinished trial work continues.':'Continue the accepted trial under the same named supervision.',details:[`${trial.workedDays}/4 actual field days recorded. Original mentor: ${trial.mentor.name}. Agreed supervisor: ${trial.supervisor.name}.`,...(trial.completion?[`Completed ${trial.completion.method} proof on day ${trial.completion.day}, attributed to ${trial.completion.supervisorName}.`]:[])],actionId:'legacycalling_'+next+'_'+trial.classId,cancelId:'legacycalling_withdraw_'+trial.classId,providerKind:'mentor',subjectId:trial.classId});
  }
  for (const obligation of s.obligations || []) {
    if (obligation.resolved || obligation.id === commission?.id) continue;
    const step = obligationStep(s, obligation.id);
    rows.push({
      key: 'obligation:' + obligation.id, kind: 'promise', commitment: true,
      title: obligation.title, status: 'active', dueDay: obligation.dueDay,
      objective: obligation.description, details: [`Due day ${obligation.dueDay} · ${obligation.missed || s.day > obligation.dueDay ? 'Overdue' : `${obligation.dueDay - s.day} days remain`}.`],
      ...step,
    });
  }
  return rows;
}

function obligationStep(s, id) {
  if (id === 'school_service') return { actionId: id, locationId: educationTeacher(s)?.locationId };
  if (id === 'living_keeper_review') return { actionId: 'quest_keeper_review' };
  if (id.startsWith('calling_service_')) {
    const calling = classView(s).callings.find(c => 'calling_service_' + c.id === id);
    const saved=calling?.initiation,needs=saved&&(saved.supervisor?.id||saved.mentorId||`calling-mentor-${calling.id}`)!==calling.mentor.id;
    return { actionId: needs?'calling_handover_'+calling.id:id, locationId: calling?.mentor.locationId, providerKind: 'mentor', subjectId: calling?.id };
  }
  if (id.startsWith('dialogue-notes-')) {
    const personId = id.slice('dialogue-notes-'.length), person = getContacts(s).find(p => p.id === personId);
    return { actionId: 'talk_' + personId, locationId: person?.locationId, personName: person?.name, personId, roomId: person?.roomId };
  }
  const fellowship = /^fellowship_(formation|companion)_(.+)$/.exec(id);
  if (fellowship) {
    const [, kind, subjectId] = fellowship, record = s.fellowship?.[kind === 'formation' ? 'formations' : 'companions']?.[subjectId];
    const project = s.fellowship?.project, active = project?.kind === kind && project.subjectId === subjectId;
    const needs=kind==='formation'&&record&&(record.supervisor?.id||record.mentorId)!==classView(s).callings.find(c=>c.id===subjectId)?.mentor.id;
    const next = needs?'handover':kind === 'formation' ? record?.stage === 'withdrawn' ? 'resume' : ['decision', 'review'].includes(record?.stage) ? 'discuss' : 'formation' : 'companion';
    const mentor = kind === 'formation' ? classView(s).callings.find(c => c.id === subjectId)?.mentor : null;
    return { actionId: needs?'fellowship_handover_'+subjectId:active ? 'fellowship_continue' : `fellowship_${next}_${subjectId}`, locationId: active&&!needs ? project.locationId : (kind === 'companion' ? fellowshipCompanionLocation(s, subjectId) : mentor?.locationId) || record?.locationId };
  }
  const ids = { exam: 'take_exam', return_research: 'return_research', oath_service: 'fulfill_oath', order_service: 'fulfill_oath', covenant_notes: 'quest_return_notes' };
  if (ids[id]) {
    const local = location(s, s.locationId), localService = ['oath_service', 'order_service'].includes(id) ? settlementServices(s).length > 0 : id === 'exam' && open(local) && local.services?.includes('academy');
    return { actionId: ids[id], ...(localService ? { locationId: s.locationId } : open(location(s, 'city')) ? { locationId: 'city' } : {}) };
  }
  if (['scholarship_service', 'plague_return', 'companion_request'].includes(id)) {
    const here = settlementServices(s).find(r => r.kind === 'doctor');
    return { actionId: 'help_clinic', providerKind: 'doctor', ...(here ? { locationId: s.locationId } : {}) };
  }
  return {};
}

/** All continuation controls reuse current offered actions and existing provider navigation. */
export function renderJournalCommitments(s, rows, actions, ui, { searching = false } = {}) {
  if (!rows.length) return '';
  const { e, button } = ui, byId = new Map(actions.map(a => [a.id, a])), providers = new Map();
  const servicesAt = id => {
    if (!providers.has(id)) providers.set(id, settlementServices(s, { siteId: id }));
    return providers.get(id);
  };
  const command = (id, label, quote = {}) => {
    const a = byId.get(id);
    if (!a) return '';
    const days = quote.actionDays ?? a.durationDays ?? a.days ?? 0, cost = quote.actionCost ?? a.quotedCost ?? a.cost ?? 0;
    return `<div class="quest-command">${button(e(label || a.label), 'activity', a.id, 'secondary small', Boolean(a.disabledReason))}<p class="small-copy">${e(a.description)}</p><small class="small-copy">${days ? `${days} committed ${days === 1 ? 'day' : 'days'}` : 'No time'} · ${cost} Gold fee</small>${ui.livingCosts?.(days) || ''}${a.disabledReason ? `<p class="disabled-reason">${e(a.disabledReason)}</p>` : ''}</div>`;
  };
  const cards = rows.map(row => {
    const site = location(s, row.locationId), a = byId.get(row.actionId), controls = [];
    const provider = site && servicesAt(site.id).find(r => row.exactPerson ? r.personId===row.personId : row.providerKind ? r.kind === row.providerKind && (!row.subjectId || r.subjectId === row.subjectId) : r.personId === row.personId || a && serviceAccepts(r, a.id));
    if (site) controls.push(button('Find ' + e(site.name), 'quest-location', site.id, 'ghost small'));
    if (!row.paused && provider && (row.providerOnly || !provider.here)) {
      if (site.id === s.locationId && (a || actions.some(a => a.id.startsWith('atlas_room_')))) controls.push(button('Visit ' + e(provider.role), 'activity-visit', provider.id, 'secondary small'));
    } else if (!row.paused && a) controls.push(command(a.id, row.actionLabel, row));
    if (!provider && site?.id === s.locationId && row.roomId && row.roomId !== s.cartography?.interior?.roomId && (a || actions.some(a => a.id.startsWith('atlas_room_')))) controls.push(button('Visit ' + e(row.personName || 'the recorded person'), 'place-area', row.roomId, 'secondary small'));
    const pause = byId.get(row.pauseId);
    if (pause) controls.push(button(row.paused ? 'Resume story' : 'Pause story', 'activity', pause.id, 'ghost small', Boolean(pause.disabledReason)) + (pause.disabledReason ? `<p class="disabled-reason">${e(pause.disabledReason)}</p>` : ''));
    if (!row.paused&&row.trackId) controls.push(command(row.trackId,'Track this search'));
    if (!row.paused&&row.alternateId) controls.push(command(row.alternateId,'Keep the uncertain account'));
    if (row.cancelId) controls.push(command(row.cancelId));
    const blocked = row.paused || !row.actionId ? '' : row.providerOnly && site && !provider ? 'The recorded workplace is not offering public service. Its saved terms remain unchanged.' : row.dueDay > s.day && !a ? '' : site && site.id !== s.locationId && !a ? `Travel to ${site.name} before continuing.` : !a ? 'Resolve the current moment or unfinished commitment before continuing.' : provider && (row.providerOnly || !provider.here) ? a.disabledReason || '' : '';
    return `<article class="journal-quest journal-commitment" data-commitment="${e(row.key)}"><header><h3>${e(row.title)}</h3><span class="badge">${e(row.paused ? 'Paused' : row.status === 'ready' ? 'Ready to deliver' : row.status==='considering'?'Saved proposal':row.kind === 'commission'||row.status==='accepted' ? 'Accepted' : 'Waiting return')}</span></header>${row.personName ? `<p class="quest-giver">${e(row.personName)}</p>` : ''}<p>${e(row.objective)}</p>${site ? `<p class="small-copy">${e(site.name)}${provider ? ' · ' + e(provider.role) : ''}</p>` : ''}${row.details.map(text => `<p class="small-copy">${e(text)}</p>`).join('')}${blocked ? `<p class="disabled-reason">${e(blocked)}</p>` : ''}<div class="quick-actions">${controls.join('')}</div></article>`;
  }).join('');
  return `<details class="panel journal-commitments" data-journal-commitments ${searching ? 'open' : 'data-disclosure="journal-commitments"'}><summary>Commitments &amp; returns · ${rows.length}</summary><p class="small-copy">Saved proposals, accepted work and optional returns. A saved proposal is not a promise. Finding a place or pausing a story spends no days or Gold. Reading a returning proposal accepts no new work; its choices quote their own terms.</p>${cards}</details>`;
}
