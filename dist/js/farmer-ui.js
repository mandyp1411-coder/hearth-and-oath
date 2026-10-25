// The farmer's Day and Book. These are readers: all choices return through
// the same public commands as the rest of the game.
import { householdCostPreview } from './budget.js';

const words = value => typeof value === 'string' ? value : '';
const paragraphsOf = chapter => Array.isArray(chapter?.paragraphs) ? chapter.paragraphs : [words(chapter?.text)].filter(Boolean);
const daysOf = choice => Number(choice.durationDays ?? choice.days ?? choice.cost?.days) || 0;
const feeOf = choice => Number(choice.quotedCost ?? (typeof choice.cost === 'object' ? choice.cost.gold : choice.cost)) || 0;
const costOf = (choice, risk, work) => {
  const days = daysOf(choice), gold = feeOf(choice);
  return [days ? `${days} ${days === 1 ? 'day' : 'days'}` : 'Now', gold ? `${gold} gold to pay` : work ? 'No more gold to pay' : 'No gold to pay', risk].filter(Boolean).join(' · ');
};
function householdWords(s, choice) {
  const days = daysOf(choice);
  if (!s?.householdBudget || !s.life || !Number.isFinite(s.day) || days <= 0) return null;
  const keep = householdCostPreview(s, days);
  if (!keep.days) return null;
  // Normal actions can leave this coin due for later; scenes collect it
  // after the days actually worked. The fee and the house stay distinct.
  const text = keep.totalDue ? keep.outstanding ? `The house needs about ${keep.totalDue} gold in all. ${keep.outstanding} of that is already due from earlier days.` : `The house needs about ${keep.totalDue} gold over this work.` : 'No gold for the house falls due over this work.';
  const remaining = Math.max(0, s.hero.gold - feeOf(choice)), short = Math.max(0, keep.totalDue - remaining);
  let risk = '';
  if (short && feeOf(choice) <= s.hero.gold) {
    const nineteenth = s.timeline?.mode === 'birth' ? (s.timeline.birthDay || 0) + 19 * 365 : Infinity;
    const carriedOnce = s.age < 19 && !s.householdBudget.graceUsed && s.day + days < nineteenth;
    risk = carriedOnce ? 'Without other coin, the neighbours carry the house this once.'
        : `Without other coin, the house will owe about ${short} gold.`;
  }
  return { text, risk };
}

export function farmerDayVisible(s) {
  return Boolean(s?.farm && s.age >= Math.max(16, s.farm.openingAge || 16) && !s.battle && !s.delve && !s.maze && !s.dungeon && !s.rpg?.expedition && !s.adventuring?.expedition);
}

/** Costs and serious risks belong inside the choice, including without numbers. */
export function renderFarmerChoices(choices, ui, { op = 'activity', state = null, showNumbers = false, reasonFor = choice => choice.disabledReason } = {}) {
  const { e } = ui;
  return `<div class="farm-choices">${choices.map(choice => {
    const reason = reasonFor(choice), originalRisk = words(choice.risk), description = words(choice.description);
    const work = op === 'choice' && state?.farm?.threads?.find(t => !t.closed && t.stage === 'open' && `farm_${t.def}` === state.event?.id && t.data.work?.remaining > 0 && t.data.work.pick === choice.id)?.data.work;
    // Timed farm risks begin with the original price. A receipt replaces
    // that sentence when only the remaining work is being offered again.
    const risk = work ? originalRisk.replace(/^[^.]*\.\s*/, '') : originalRisk;
    const extra = !work && description && (!risk || !description.includes(risk)) ? description : '';
    const keep = householdWords(state, choice);
    return `<button type="button" class="choice-card farm-choice" data-op="${op}" data-id="${e(choice.id)}"${reason ? ' disabled' : ''}><strong class="choice-label">${e(choice.label)}</strong><span class="farm-choice-cost" data-farm-choice-cost>${e(costOf(choice, risk, work))}</span>${work?.gold ? `<span class="choice-description" data-farm-prepaid>${e(work.gold)} gold already paid.</span>` : ''}${keep ? `<span class="choice-description" data-farm-household-cost>${e(keep.text)}</span>${keep.risk ? `<span class="choice-description" data-farm-debt-risk>${e(keep.risk)}</span>` : ''}` : ''}${extra ? `<span class="choice-description">${e(extra)}</span>` : ''}${showNumbers && choice.detail ? `<small class="action-detail">${e(choice.detail)}</small>` : ''}${reason ? `<span class="disabled-reason">${e(reason)}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

/** Keep the first decision close; the longer account remains on the same leaf. */
export function renderFarmerScene(event, ui, options = {}) {
  const { e, paragraphs } = ui;
  const body = words(event.body), split = body.match(/^(.{1,180}?[.!?])(?:\s|$)/), lead = split ? split[1] : '';
  const rest = lead ? body.slice(lead.length).trim() : body;
  return `<article class="story-scene farm-scene" data-farm-scene><h2>${e(event.title)}</h2>${lead ? `<p class="farm-scene-lead">${e(lead)}</p>` : ''}${renderFarmerChoices(event.choices, ui, { ...options, op: 'choice' })}${rest ? `<div class="farm-scene-account">${paragraphs(rest)}</div>` : ''}</article>`;
}

function peopleMarkup(s, view, ui) {
  const { e, personPortrait } = ui;
  if (!view.people?.length) return '';
  const regard = n => n >= 10 ? 'Trusts your judgement' : n <= -10 ? 'Keeps their distance' : 'Still weighing your words';
  const bond = n => n >= 70 ? 'A close bond' : n >= 35 ? 'A bond still growing' : 'A frayed bond';
  return `<details class="farm-people" data-disclosure="farm-people"><summary>The people at your door</summary><div class="farm-people-grid">${view.people.slice(0, 8).map(person => `<article class="farm-person"><header>${personPortrait?.(person) || ''}<div><h3>${e(person.name)}</h3><p>${e(person.role)}</p></div></header>${person.want ? `<p>${e(person.want)}</p>` : ''}<p class="farm-person-regard">${e(regard(person.opinion))}. ${e(bond(person.bond))}.</p>${person.memories?.slice(-3).map(memory => `<p class="farm-memory">“${e(memory)}”</p>`).join('') || ''}<details><summary>A closer look</summary><p>The bond ${e(person.bond)} · Their opinion ${e(person.opinion)}</p></details></article>`).join('')}</div></details>`;
}

export function renderFarmerBook(s, view, ui, { embedded = false } = {}) {
  if (!view) return '';
  const { e, paragraphs } = ui;
  const chapters = view.chapters || [];
  const body = chapters.map(chapter => `<section class="farm-book-chapter"><h3>${e(chapter.title)}</h3>${paragraphsOf(chapter).map(text => paragraphs(text)).join('')}</section>`).join('') || '<p>The pages wait for your hand.</p>';
  const ambition = view.ambition ? `<section class="farm-book-purpose"><h3>What this life sought</h3><p>${e(view.ambition.title)}${view.ambition.fulfilled ? '. Kept.' : '. Still before you.'}</p>${view.ambition.text ? paragraphs(view.ambition.text) : ''}</section>` : '';
  const promises = Array.isArray(s.farm?.promises) ? s.farm.promises.filter(p => typeof p?.text === 'string') : [];
  const oath = promises.length ? `<section class="farm-book-promises"><h3>The words you gave</h3>${promises.map(p => `<p>${e(p.text)}${p.status === 'broken' ? ' Broken.' : p.status === 'kept' ? ' Kept.' : p.status === 'released' ? ' Released.' : ' Still held.'}</p>`).join('')}</section>` : '';
  return `<${embedded ? 'div' : 'article'} class="farm-book" data-farm-book>${embedded ? '' : `<header><h1>The Book of ${e(s.hero.name)}</h1><p>A life, in its own words.</p></header>`}${body}${ambition}${oath}</${embedded ? 'div' : 'article'}>`;
}

export function renderFarmerDay(s, view, actions, ui, { scene = '', continuation = '', world = '', seasonReason = '', showNumbers = false } = {}) {
  if (!view) return '';
  const { e, button, paragraphs } = ui;
  const offers = actions.filter(action => action.id.startsWith('farm_')).slice(0, 12);
  const decision = scene || `<section class="farm-decisions" data-right-now><h2>${e(view.title)}</h2>${renderFarmerChoices(offers, ui, { state: s, showNumbers })}${!offers.length ? `<p>${e(view.summary)}</p>` : ''}</section>`;
  const ambition = view.ambition ? `<div class="farm-ambition"><span>What you seek</span><strong>${e(view.ambition.title)}</strong>${view.ambition.fulfilled ? '<span>Kept</span>' : ''}</div>` : '';
  const nextSeason = !scene && !continuation ? `<div class="farm-season">${button('Live the season', 'live-season', '', 'secondary', Boolean(seasonReason))}<p>${e(seasonReason || 'The field turns with the seasons. You stop when a choice comes to your door.')}</p></div>` : '';
  const plan = view.plan ? `<details class="farm-plan" data-disclosure="farm-plan"><summary>${e(view.plan.title)}</summary>${paragraphs(view.plan.text)}</details>` : '';
  const inherited = view.inheritance ? `<details class="farm-inheritance" data-disclosure="farm-inheritance"><summary>What came down to you${view.inheritance.parentName ? ` from ${e(view.inheritance.parentName)}` : ''}</summary>${paragraphs(view.inheritance.field === 'held' ? 'The field is still held.' : view.inheritance.field === 'bonded' ? 'The field came under the bond.' : 'The family field was lost.')}${Number.isFinite(view.inheritance.debt) && view.inheritance.debt > 0 ? `<p>${e(view.inheritance.debt)} gold still owed on the field.</p>` : ''}${['story', 'saying', 'feud'].map(key => words(view.inheritance[key])).filter(Boolean).map(text => paragraphs(text)).join('')}</details>` : '';
  return `<div class="farmer-day" data-farmer-day>${decision}${continuation}${nextSeason}<section class="farm-hearth">${ambition}${scene || !offers.length ? '' : `<p>${e(view.summary)}</p>`}${plan}${peopleMarkup(s, view, ui)}${inherited}<details class="farm-book-door" data-disclosure="farm-book"><summary>Read the Book of ${e(s.hero.name)}</summary>${renderFarmerBook(s, view, ui, { embedded: true })}${button('Open the Book', 'tab', 'journal', 'ghost small')}</details><details class="farm-further" data-disclosure="farm-further"><summary>Beyond the field</summary><div class="farm-further-links">${button('Other things to do', 'tab', 'activities', 'ghost small')}${button('Plans &amp; household', 'workspace-section', 'life:plans', 'ghost small')}${button('Go into the village', 'place-open', '', 'ghost small')}</div>${world}</details></section></div>`;
}
