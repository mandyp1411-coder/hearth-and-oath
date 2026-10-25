import { roleTitle } from './interaction-ui-v40.js';
import { settlementServices } from './world-services.js';
import { storyInvitations, storyView } from './life-stories.js';
import { groundedQuest } from './grounded-narrative-content.js';
import { getContacts, getThread, rememberedContacts } from './conversations.js';
import { getActions } from './engine.js';
import { renderAvatar } from './avatar.js';
import { isSettlement } from './world.js';
import { hexAtlas } from './cartography.js';

// Contacts are located in a settlement, not in a particular room. A room UI
// should call this list "In this settlement", rather than placing every friend
// in the tavern or inventing a new encounter when the room is opened.
function physicallyAtSettlement(state) {
  if (!state?.hero || !state.world || state.phase === 'retired' || state.phase === 'dead' || state.hero.alive === false) return false;
  if (state.cartography?.offsite || state.cartography?.pending || state.timeline?.journey || state.justice?.prison) return false;
  if (!isSettlement(state.world, state.locationId) || state.realm?.sites?.[state.locationId]?.phase === 'ruin') return false;
  if (state.cartography?.position && hexAtlas(state).byKey[state.cartography.position]?.siteId !== state.locationId) return false;
  return true;
}

function localContact(person, state) {
  // Captured correspondence can keep a retired teacher in getContacts so an
  // old reply survives. That record does not place the teacher in today's room.
  return person.locationId === state.locationId && person.available !== false && person.alive !== false && person.retired !== true && !['retired teacher', 'archived keeper'].includes(person.role) && (person.minAge ?? 0) <= state.age;
}

/** Known, living, age-appropriate contacts in the hero's physical settlement. */
export function nearbyContacts(state) {
  if (!physicallyAtSettlement(state)) return [];
  // getContacts enforces each source person's availability and minimum player
  // age, including absent family, deceased people and archived shrine keepers.
  const services=new Map(settlementServices(state).map(r=>[r.personId,r]));
  return getContacts(state).filter(person => localContact(person, state)&&(!person.roomId||person.roomId===(state.cartography?.interior?.roomId||'gate'))&&(!services.has(person.id)||services.get(person.id).here));
}

function replyBlockReason(state) {
  if (state.phase === 'retired' || state.phase === 'dead' || state.hero?.alive === false) return 'This life has ended. Earlier correspondence remains in your records.';
  if (state.event || state.battle) return 'Finish the current situation before replying.';
  if (state.cartography?.offsite || state.cartography?.pending) return 'Return to a named place before opening correspondence.';
  return '';
}

function unavailableConversation(state) {
  const reason = replyBlockReason(state);
  if (reason) return reason;
  if (state.timeline?.journey) return 'Finish your current journey before starting correspondence.';
  if (state.justice?.prison || state.careers?.batch || state.workshop?.project) return 'Continue or finish your current commitment before starting another conversation.';
  return 'No new conversation is available in this moment. Earlier messages remain here.';
}

/**
 * One dialogue surface over the existing conversations and action offers.
 * Rendering never opens a thread, marks mail read, commits a reply or moves time.
 */
export function renderConversationPanel(state, personId, ui, { compact = false } = {}) {
  const {e,button,paragraphs,actionCards}=ui;
  if(!state?.hero||!Array.isArray(state.world?.locations)||typeof personId!=='string')return '<section class="dialogue-scene"><h2>Choose a person</h2><p>Approach someone in their actual settlement to speak.</p></section>';
  const person=getContacts(state).find(p=>p.id===personId);
  if(!person&&state.conversations?.pending?.personId===personId){const old=rememberedContacts(state).find(p=>p.id===personId),pending=state.conversations.pending;return `<section class="dialogue-scene"><h2>An unfinished earlier exchange</h2><p>${e(old?.name||'This person')} cannot currently take part. Their original words remain in your records; no reply or reward can be claimed from a successor.</p>${pending.snapshot?.body?paragraphs(pending.snapshot.body):''}<button type="button" class="button secondary" data-op="reply" data-person="${e(personId)}" data-id="${e(pending.replies[0]?.id||'')}">Close this unfinished exchange without replying</button>${button('Read your relationship records','tab','relationships','ghost small')}</section>`;}
  if(!person)return `<section class="dialogue-scene"><h2>This person is unavailable</h2><p>Their earlier place in your life remains in Relationships.</p>${button('Read your relationship records','tab','relationships','secondary')}</section>`;
  const local=nearbyContacts(state).some(p=>p.id===personId),thread=getThread(state,personId),pending=state.conversations?.pending;
  const earlierReply=!local&&pending?.personId===personId,waiting=pending&&pending.personId!==personId?getContacts(state).find(p=>p.id===pending.personId):null;
  const blocked=replyBlockReason(state),actions=local&&!blocked&&!pending?getActions(state):[];
  const talk=actions.find(a=>a.id==='talk_'+personId),topic=actions.find(a=>a.id==='talk_quest_'+personId);
  const deferredPlan=actions.find(a=>a.id==='society_revisit_'+personId);
  const levyOffers=actions.filter(a=>a.levyTopic===true&&a.levyPersonId===personId);
  const stories=[...storyInvitations(state).filter(q=>q.personId===personId),...(storyView(state)?.arcs||[]).filter(q=>q.personId===personId&&q.status==='active')];
  const storyOffers=stories.flatMap(q=>{const a=actions.find(a=>a.id==='stories_open_'+q.id);return a?[{...a,label:groundedQuest(state,q,{kind:'personal'}).title||a.label,description:'Ask about what they need. Hear the details before deciding.'}]:[];});
  const companionOffers=actions.filter(a=>['rpg_meet_'+personId,'rpg_companion_'+personId].includes(a.id));
  const confidant=state.hero.condition&&!person.knownFacts?.includes('condition_'+state.hero.condition.type)?actions.find(a=>a.id==='confide_'+person.id):null;
  const socialOffers=actions.filter(a=>/^(people_(orientation|court|hang|favor|deliver|withdraw)_)/.test(a.id)&&a.id.endsWith('_'+personId));
  const extras=actions.filter(a=>a.factionObjective&&a.objectivePersonId===personId||/^life_(visit|gift|court|commit|separate|endcourt|values)_/.test(a.id)&&a.id.endsWith('_'+personId)||a.id==='conversations_repair_'+personId||['conversations_continue','conversations_cancel'].includes(a.id)&&state.conversations?.project?.personId===personId);
  const place=state.world.locations.find(l=>l.id===person.locationId),last=thread.messages.at(-1);
  // A birthday letter arriving after an opener cannot replace its proposal.
  const savedBody=pending?.personId===personId?pending.snapshot?.body:null;
  const words=savedBody?(thread.messages.findLast(m=>m.speaker===personId&&m.text===savedBody)||{speaker:personId,text:savedBody}):last;
  const channel=words?.channel||([...(state.inbox?.entries||[]),...(state.inbox?.archive||[])].some(n=>n.sourceId===words?.id&&n.kind==='letter')?'letter':'unknown');
  const liveWords=words?.speaker===personId&&channel==='spoken'&&words.day===state.day;
  const line=liveWords?words.text:person.description;
  const gap=Number.isSafeInteger(words?.day)?state.day-words.day:null;
  const when=words?`${Number.isSafeInteger(words.day)?ui.date?.(words.day)||('Day '+words.day):'Date unrecorded'}${Number.isInteger(words.age)?' · Age '+words.age:''}${gap>0?' · '+(gap>=365?Math.floor(gap/365)+' year'+(gap>=730?'s':''):gap+' day'+(gap===1?'':'s'))+' ago':''}`:'';
  const earlier=words?.speaker===personId&&!liveWords?`<details class="earlier-correspondence" data-message-channel="${e(channel)}"${savedBody?' open':''}><summary>${savedBody?'An unfinished earlier exchange':channel==='letter'?'Read earlier correspondence':'Read earlier recorded words'} · ${e(when)}</summary><p class="small-copy">${savedBody?'These are the words kept from that exchange.':'Kept in your records.'}</p>${paragraphs(words.text)}</details>`:'';
  // Preview only this person's captured words, never a regenerated scene or
  // their eventual answer. Published pending snapshots remain unchanged.
  const savedChoices=pending?.personId===personId&&['levy_reaction','levy_household','levy_return'].includes(pending.nodeId)?pending.snapshot?.choices:null;
  const capturedChoices=Array.isArray(savedChoices)&&thread.replies.every(r=>typeof savedChoices.find(c=>c?.id===r.id)?.text==='string')?savedChoices:null;
  const description=capturedChoices?.find(c=>c.id===thread.replies[0]?.id)?.description;
  const sharedNote=typeof description==='string'&&thread.replies.every(r=>r.description===description&&capturedChoices.find(c=>c.id===r.id).description===description)?description:null;
  const replies=(local||earlierReply)&&thread.replies.length?`<div class="dialogue-choices" aria-label="Choose what you say"><h3>Your response</h3>${sharedNote!==null?`<p class="dialogue-choice-note">${e(sharedNote)}</p>`:''}${blocked?`<p class="disabled-reason">${e(blocked)}</p>`:''}${thread.replies.map((r,i)=>`<button type="button" class="dialogue-choice" data-op="reply" data-id="${e(r.id)}" data-person="${e(person.id)}" ${blocked?'disabled':''}><span class="choice-number">${i+1}</span><span><strong>${e(r.label)}</strong>${capturedChoices?`<span class="dialogue-reply-preview">${e(capturedChoices.find(c=>c.id===r.id).text)}</span>`:''}${sharedNote===null?`<small>${e(r.description||'')}</small>`:''}${r.traitPreview?`<small class="trait-preview">${e(r.traitPreview)}</small>`:''}</span><span aria-hidden="true">›</span></button>`).join('')}</div>`:'';
  const start=local&&!thread.replies.length?`<div class="dialogue-topics">${deferredPlan?`<section class="conversation-requests" data-deferred-person-plan><h3>Your unfinished plan</h3>${actionCards([deferredPlan])}</section>`:''}${talk?actionCards([talk]):`<p class="small-copy">${e(pending?'Another exchange is still unfinished.':unavailableConversation(state))}</p>`}${topic?`<details data-disclosure="conversation-topics"><summary>Earlier personal topics</summary>${actionCards([topic])}</details>`:''}${levyOffers.length?`<section class="conversation-requests"><h3>After the Winter Levy</h3>${actionCards(levyOffers)}</section>`:''}${storyOffers.length||companionOffers.length?`<section class="conversation-requests"><h3>Something on Their Mind</h3>${actionCards([...storyOffers,...companionOffers])}</section>`:''}${confidant?actionCards([confidant]):''}${socialOffers.length?`<section class="conversation-requests"><h3>Spend Time & Ask Questions</h3>${actionCards(socialOffers)}</section>`:''}${extras.length?`<details data-disclosure="conversation-person-actions"><summary>Spend time together</summary>${actionCards(extras)}</details>`:''}</div>`:'';
  return `<section class="dialogue-scene ${compact?'compact':''}" data-contact-id="${e(person.id)}" aria-label="Dialogue with ${e(person.name)}"><header class="dialogue-setting"><span class="eyebrow">${earlierReply?'AN EARLIER UNFINISHED EXCHANGE':'A MEETING IN THE WORLD'}</span><span>${e(place?.name||'Place unrecorded')}</span></header><div class="dialogue-stage"><div class="dialogue-speaker">${renderAvatar(person,{size:'large',age:person.age})}<h2 tabindex="-1">${e(person.name)}</h2><p>${e(roleTitle(person.role))} · Age ${e(person.age)}</p></div><div class="dialogue-window" tabindex="-1"><span class="speaker-name">${e(person.name)}</span>${paragraphs(line||'They wait to hear what you have to say.')}<p class="dialogue-presence-v22">${local?'In person · In this settlement':earlierReply?'An unfinished earlier correspondence keeps its saved response choices. New meetings require their actual presence.':'Their recorded place is elsewhere. Go there to speak with them.'}</p>${person.concern?`<p class="small-copy" data-person-concern>${e(person.concern)}</p>`:''}${person.boundary?`<p class="notice" data-person-boundary>${e(person.boundary)}</p>`:''}</div></div>${earlier}${waiting?`<div class="notice" role="status"><p>${e(waiting.name)} is waiting for your reply.</p>${button('Return to '+e(waiting.name),'show-contact',waiting.id,'secondary')}</div>`:''}${replies}${start}<footer class="dialogue-footer">${local&&!thread.replies.length?button('Leave the conversation','spatial-back','','secondary'):''}${!local&&!earlierReply?button('Find their recorded place','person-place',person.id,'primary'):''}${button('Relationships','tab','relationships','ghost small')}${person.kind==='companion'?button('Manage traveling party','tab','party','ghost small'):''}</footer></section>`;
}
