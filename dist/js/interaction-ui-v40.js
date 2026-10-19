import { renderAvatar } from './avatar.js';
import { actionCostSummary } from './action-costs.js';

const connectors=new Set(['a','an','and','as','at','by','for','from','in','of','on','or','the','to','with']);
/** Display a person's title without changing their saved role or identity. */
export function roleTitle(value){
  return String(value||'').replace(/_/g,' ').replace(/(^|[\s/-])(\p{L})([\p{L}\p{M}’']*)/gu,(word,prefix,first,rest,offset)=>prefix+(offset>0&&prefix!=='-'&&connectors.has((first+rest).toLowerCase())?(first+rest).toLowerCase():first.toLocaleUpperCase()+rest));
}
export function activityQuote(a={},s=null){return actionCostSummary(s,a);}
/** A shared, full-width choice for situated conversations and daily activities. */
export function interactionChoice(ui,{label,op,id='',description='',meta='',costDetails='',disabledReason='',disabled=false,quiet=false}={}){
  const {e}=ui;
  return `<button type="button" class="interaction-choice${quiet?' quiet-choice':''}" data-op="${e(op)}" data-id="${e(id)}"${disabled||disabledReason?' disabled':''}><span class="interaction-copy"><strong>${e(label)}</strong>${meta?`<small class="interaction-quote">${e(meta)}</small>`:''}${description?`<span class="interaction-description">${e(description)}</span>`:''}${costDetails?`<small class="living-cost-note interaction-cost-details">${e(costDetails)}</small>`:''}${disabledReason?`<span class="disabled-reason">${e(disabledReason)}</span>`:''}</span><span class="interaction-arrow" aria-hidden="true">›</span></button>`;
}
export function meetingShell(s,r,ui,{speech='',details='',choices='',after='',backLabel='← Back',className=''}={}){
  const {e,button}=ui;
  return `<section class="service-meeting consistent-meeting ${e(className)}" data-service-person="${e(r.personId)}" aria-label="${e(roleTitle(r.role))} Services">${button(backLabel,'service-close','','ghost small meeting-back')}<header class="dialogue-speaker">${renderAvatar(r.person,{size:'large',age:r.person.age})}<div><span class="eyebrow">${e(roleTitle(r.role))}</span><h1 id="${r.kind==='merchant'?'shop-speaker':'meeting-speaker'}" tabindex="-1">${e(r.name)}</h1></div></header><div class="dialogue-window">${e(speech)}</div>${details}<div class="interaction-options" role="group" aria-label="Choices with ${e(r.name)}">${choices}</div>${after}</section>`;
}
