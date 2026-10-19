import { getActions } from './engine.js';
import { getContacts } from './conversations.js';
import { renderAvatar } from './avatar.js';
import { socialView } from './social.js';
import { pastimeView } from './pastimes.js';
import { recoveryView } from './health.js';

const ICONS = {
  manuscripts:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  sketching:'m5 19 2-6L17 3l4 4-10 10-6 2ZM7 13l4 4M15 5l4 4',
  music:'M9 18V6l10-3v12M9 6l10-3M9 16c-5-2-7 4-3 5 2 1 3-1 3-3Zm10-3c-5-2-7 4-3 5 2 1 3-1 3-3Z',
  gardening:'M12 21V10M12 14C3 14 3 7 3 7c8-1 9 7 9 7Zm0-4s-1-8 9-8c0 0 1 9-9 8ZM7 21h10',
  storytelling:'M4 5c3-2 6-1 8 1 2-2 5-3 8-1v15c-3-2-6-1-8 1-2-2-5-3-8-1V5Zm8 1v15M7 9h2m6 0h2M7 13h2m6 0h2',
  strategy:'M5 21h14M7 17h10l-2-7 3-5-5-2-2 5-4 1v3h5l-5 5Zm0 0v4m10-4v4',
};

function interestIcon(id) {
  return `<svg class="pastime-emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[id] || ICONS.storytelling}"/></svg>`;
}

function contactChip(id,name,contacts,ui,small=false) {
  const person=contacts.find(p=>p.id===id);
  if(!person)return `<span class="social-known-name">${ui.e(name)}</span>`;
  return `<button type="button" class="social-person-link ${small?'small':''}" data-op="show-contact" data-id="${ui.e(id)}">${small?'':renderAvatar(person,{size:'small',age:person.age})}<span>${ui.e(person.name)}</span><span class="social-person-arrow" aria-hidden="true">›</span></button>`;
}

function socialActionGroups(offered,ui) {
  if(!offered.length)return '';
  const introductions=offered.filter(a=>a.id.startsWith('social_introduce_'));
  const ordinary=offered.filter(a=>!a.id.startsWith('social_introduce_')).sort((a,b)=>Number(b.id==='social_gather')-Number(a.id==='social_gather'));
  return `${ordinary.length?ui.actionCards(ordinary.slice(0,2)):''}${ordinary.length>2?`<details class="life-ui-disclosure" data-disclosure="social-other-plans"><summary>Other plans<span>${ordinary.length-2}</span></summary>${ui.actionCards(ordinary.slice(2))}</details>`:''}${introductions.length?`<details class="life-ui-disclosure" data-disclosure="social-introductions"><summary>Bring people together<span>${introductions.length}</span></summary>${ui.actionCards(introductions)}</details>`:''}`;
}

/** A view of witnessed connections, never the entire private social graph. */
export function socialPanel(s,ui,selectedPersonId=null) {
  const v=socialView(s);if(!v.enabled)return '';
  const {e,date}=ui,contacts=getContacts(s);
  const ties=(v.ties || []).filter(t=>!selectedPersonId || t.personId===selectedPersonId || t.otherPersonId===selectedPersonId);
  const notices=(v.notices || []).filter(n=>!selectedPersonId || (n.actorIds || []).includes(selectedPersonId)).slice(-8).reverse();
  const offered=getActions(s).filter(a=>a.id.startsWith('social_') && (!selectedPersonId || !a.id.startsWith('social_checkin_') || a.id===`social_checkin_${selectedPersonId}`));
  const circles=selectedPersonId?[]:(v.circles || []).filter(c=>c.people?.length);
  if(s.age<4&&!ties.length&&!notices.length&&!offered.length)return '';
  const person=contacts.find(p=>p.id===selectedPersonId);
  const tieCard=t=>`<article class="social-tie" data-social-tie="${e(t.id)}"><div class="social-tie-people">${contactChip(t.personId,t.name,contacts,ui,true)}<span class="social-tie-thread" aria-hidden="true">—</span>${contactChip(t.otherPersonId,t.otherName,contacts,ui,true)}</div><span class="social-tie-label">${e(t.label || ui.title(t.kind))}</span><p>${e(t.description)}</p></article>`;
  const noticeCard=n=>`<li class="social-notice" data-social-notice="${e(n.id)}"><span class="social-note-mark" aria-hidden="true">✦</span><div><div class="social-notice-heading"><strong>${e(n.title)}</strong><time>${e(date(n.day))}</time></div><p>${e(n.text)}</p></div></li>`;
  const circleMarkup=circles.length?`<details class="life-ui-disclosure" data-disclosure="social-familiar-faces"><summary>The familiar faces<span>${circles.reduce((n,c)=>n+c.people.length,0)}</span></summary><div class="social-circles">${circles.map(c=>`<section class="social-circle"><h3>${e(c.title)}</h3><div class="social-circle-people">${c.people.map(p=>contactChip(p.id,p.name,contacts,ui)).join('')}</div></section>`).join('')}</div></details>`:'';
  const tiesMarkup=ties.length?`<div class="social-ties">${ties.slice(0,2).map(tieCard).join('')}</div>${ties.length>2?`<details class="life-ui-disclosure" data-disclosure="social-more-connections"><summary>More familiar connections<span>${ties.length-2}</span></summary><div class="social-ties">${ties.slice(2).map(tieCard).join('')}</div></details>`:''}`:person?`<p class="life-ui-empty">You have not heard much about ${e(person.name)}’s other friendships.</p>`:'<p class="life-ui-empty">For now, you know these people separately. There are stories you have not heard.</p>';
  const noticesMarkup=notices.length?`<section class="social-hearth-notes"><h3>What you have heard</h3><ol>${notices.slice(0,1).map(noticeCard).join('')}</ol>${notices.length>1?`<details class="life-ui-disclosure" data-disclosure="social-earlier-notices"><summary>Earlier word<span>${notices.length-1}</span></summary><ol>${notices.slice(1).map(noticeCard).join('')}</ol></details>`:''}</section>`:'';
  return `<section class="roleplay-section social-life-section"><div class="section-heading"><div><span class="eyebrow">${person?'AROUND '+e(person.name):'WORD AROUND THE HEARTH'}</span><h2>${person?'The people in their life':'A circle of lives'}</h2></div></div>${tiesMarkup}${circleMarkup}${noticesMarkup}${socialActionGroups(offered,ui)}</section>`;
}

function hobbyCard(h,ui) {
  return `<article class="pastime-card ${h.active?'active':''}" data-interest-id="${ui.e(h.id)}">${interestIcon(h.id)}<div><div class="pastime-card-heading"><h3>${ui.e(h.name)}</h3>${h.active?'<span class="pastime-active">Your pastime</span>':''}</div><p>${ui.e(h.description)}</p>${h.practiceDays>0?`<small>${ui.e(h.practiceDays)} ${h.practiceDays===1?'day':'days'} spent practicing</small>`:''}</div></article>`;
}

function petCard(p,ui,remembered=false) {
  const species=String(p.species || '').toLowerCase();
  const portrait=species==='cat'?'<path d="M6 12 5 4l6 4h2l6-4-1 8c3 7-15 7-12 0ZM9 12h.1m6 0h.1M12 14v2M3 13l5 1m8 0 5-1M3 17l5-1m8 0 5 1"/>':['dog','hound'].includes(species)?'<path d="m7 8-3-4-2 8 5 3M17 8l3-4 2 8-5 3M7 8c3-3 7-3 10 0v9c-2 4-8 4-10 0V8ZM9 12h.1m6 0h.1M10 16h4l-2 2-2-2Z"/>':'<path d="M3 18 7 13c0-5 4-8 8-5 1-5 5-5 6-1l2 2-5 1c1 6-3 9-8 8l-7 2 3-4M8 14l5-3-1 5-4-2Zm8-7h.1M11 18v4m4-5 1 5M9 22h4m1 0h4"/>';
  return `<article class="pastime-pet ${remembered?'remembered':''}" data-pet-id="${ui.e(p.id)}"><div class="pastime-pet-portrait"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${portrait}</svg></div><div><span class="eyebrow">${remembered?'REMEMBERED':'A SMALL COMPANION'}</span><h3>${ui.e(p.name)}</h3><p class="pastime-pet-meta">${ui.e(ui.title(p.species))}${Number.isFinite(p.age)?` · Age ${ui.e(p.age)}`:''}</p>${p.description?`<p>${ui.e(p.description)}</p>`:''}${remembered&&p.cause?`<p class="small-copy muted">${ui.e(p.cause)}</p>`:''}</div></article>`;
}

/** Pastimes remain ordinary activities with their actual time and price visible. */
export function pastimePanel(s,ui,compact=false) {
  const v=pastimeView(s);if(!v.enabled)return '';
  const {e,actionCards,date}=ui;
  const offered=getActions(s).filter(a=>a.id.startsWith('pastime_'));
  const hobbies=v.hobbies || [],lived=hobbies.filter(h=>h.active||h.practiceDays>0);
  const pet=v.pet,remembered=v.petHistory || [],history=v.history || [];
  if(compact&&s.age<4&&!pet&&!lived.length)return '';
  const chosen=lived.find(h=>h.active)||lived[0];
  const empty=s.age<4?'Familiar voices and the room around you fill your world.':s.age<7?'A little free time. Something that is yours to enjoy.':s.age<12?'After lessons, before the lamps are lit. What will you do?':s.age<18?'Some days belong to school. Some are your own.':'There is life beyond work and the road.';
  const chooseActions=offered.filter(a=>a.id==='pastime_interest'||/^pastime_(choose|interest)_/.test(a.id));
  const ordinaryActions=offered.filter(a=>!chooseActions.includes(a));
  const compactActions=ordinaryActions.filter(a=>!a.disabledReason).sort((a,b)=>Number(/practice|care/.test(b.id))-Number(/practice|care/.test(a.id))).slice(0,2);
  return `<section class="roleplay-section pastime-section ${compact?'compact':''}"><div class="section-heading"><div><span class="eyebrow">THE HOURS BETWEEN</span><h2>${s.age<12?'Small adventures':'A life of your own'}</h2></div>${s.age>0?`<span class="badge">Age ${e(s.age)}</span>`:''}</div>${lived.length?`<div class="pastime-cards">${(compact?[chosen]:lived).filter(Boolean).map(h=>hobbyCard(h,ui)).join('')}</div>`:`<p class="life-ui-empty">${empty}</p>`}${pet?petCard(pet,ui):''}${actionCards(compact?compactActions:ordinaryActions)}${compact?ui.button('Pastimes &amp; small adventures','tab','activities','ghost small'):chooseActions.length?`<details class="life-ui-disclosure" data-disclosure="pastime-interests" ${!chosen?'open':''}><summary>${chosen?'Try another pastime':'Find something you love'}<span>${chooseActions.length}</span></summary>${actionCards(chooseActions)}</details>`:''}${!compact&&remembered.length?`<details class="life-ui-disclosure" data-disclosure="pastime-remembered-pets"><summary>Small lives remembered</summary>${remembered.map(p=>petCard(p,ui,true)).join('')}</details>`:''}${!compact&&history.length?`<details class="life-ui-disclosure" data-disclosure="pastime-earlier-days"><summary>Days you remember</summary><ol class="pastime-records">${history.slice(-12).reverse().map(h=>`<li><div><strong>${e(h.title)}</strong><time>${e(date(h.day))}</time></div><p>${e(h.text)}</p></li>`).join('')}</ol></details>`:''}</section>`;
}
import { storyView } from './life-stories.js';

export function storiesPanel(s,ui){
  const v=storyView(s);if(!v||s.age<18||s.phase==='retired')return '';
  const {e,button,actionCards}=ui,offered=getActions(s).filter(a=>a.id.startsWith('stories_open_'));
  const active=v.arcs.filter(a=>a.status==='active'),last=v.history.at(-1);
  return `<details class="life-ui-disclosure personal-stories" data-disclosure="personal-stories"><summary>Personal stories<span>${offered.length?offered.length+' chapters waiting':active.length+' unfinished'}</span></summary><p class="small-copy">People keep their own accounts. A choice can return years later, with the same names and places.</p>${last?`<article class="personal-return"><strong>${e(last.title)}</strong><p>${e(last.text)}</p>${button('Read '+e(last.personName)+'’s correspondence','show-contact',last.personId,'ghost small')}</article>`:''}${active.map(a=>`<p><strong>${e(a.title)}</strong> · ${e(a.personName)} · ${a.chapter}/${a.totalChapters||3} chapters${s.age<a.nextAge?' · returns at age '+a.nextAge:''}</p>`).join('')}${actionCards(offered)}${v.arcs.some(a=>a.status!=='active')?`<p class="small-copy">${v.arcs.filter(a=>a.status==='completed').length} stories completed · ${v.arcs.filter(a=>a.status==='abandoned').length} left behind. Their recorded consequences remain in the chronicle and world.</p>`:''}</details>`;
}

export function recoveryPanel(s,ui){
  if(s.age<16||s.phase==='retired')return '';
  const offered=getActions(s).filter(a=>a.id.startsWith('recovery_')),v=recoveryView(s),p=v.plan;
  if(!offered.length&&!p)return '';
  const {e,button}=ui;
  return `<details class="life-ui-disclosure recovery-plans" data-disclosure="recovery-plans" ${p?'open':''}><summary>Set aside time to recover<span>${p?p.remainingDays+' days remain':'14, 28 or 56 days'}</span></summary><p>${e(v.terms)}</p><p>Living costs continue. Dedicated recovery days earn no work wages. Birthdays, obligations and supernatural needs pause the plan. A separate rest, support or healer session supports symptoms but adds no plan attendance.</p>${p?`<div class="career-stats"><div><span>Plan attendance</span><strong>${p.attendedDays}/${p.totalDays} days</strong></div><div><span>Symptom-care days recorded</span><strong>${p.careDays??'Not separately recorded'}</strong></div><div><span>Consultation</span><strong>${p.paid?p.fee+'g paid once':p.fee+'g on first attendance'}</strong></div></div>${p.unrecordedCareDays?`<p class="small-copy">${p.unrecordedCareDays} earlier attended days have no separate symptom-care count. Their attendance is retained; missing care credit is not invented.</p>`:''}`:''}${offered.length?ui.actionCards(offered):`<p class="muted">The plan and its remaining days are saved. Resolve the waiting decision before continuing.</p>${button('Return to your life','tab','life','secondary')}`}</details>`;
}
