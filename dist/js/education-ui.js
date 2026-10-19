import { EDUCATION_LABELS } from './education-progress.js';
export function birthdayEducationRecap(s) {
  const personal=s.timeline?.yearHistory?.at(-1);if(!personal)return null;
  const school=s.education?.history?.findLast(r=>r.day===personal.day&&r.age===personal.age&&r.title==='A school year remembered');
  return {age:personal.age,day:personal.day,title:personal.title,personal:personal.summary,school:school?.text || null};
}
export function renderBirthdayRecap(s,ui) {
  const v=birthdayEducationRecap(s);if(!v?.school)return '';
  const {e}=ui;
  return `<details class="panel birthday-recap" data-birthday-recap open><summary>Age ${v.age} · Birthday &amp; school year</summary><h3>${e(v.title)}</h3><p data-birthday-outcome>${e(v.personal)}</p><h3>The school year</h3><p data-school-outcome>${e(v.school)}</p><p class="small-copy">Both accounts remain in your Journal and school records.</p></details>`;
}
export function renderCourseRecords(rows,ui) {
  if(!rows?.some(r=>!r.active))return '';
  return `<details class="construction-section" data-disclosure="kept-courses"><summary>Your kept course preparation</summary>${rows.map(r=>`<article class="school-route" data-course-record="${r.route}"><h3>${ui.e(r.label)} · ${r.active?'Current':'Paused'}</h3><p>${r.attendance} attended sessions · ${r.progress} course progress · ${r.performance}/100 performance${r.qualified?' · Qualification earned':''}.</p></article>`).join('')}<p class="small-copy">Returning restores the preparation shown here. A transfer takes its stated day and fee. Lessons, revisions and examinations keep their shared annual limits.</p></details>`;
}
export function renderSchoolTransfer(q,ui) {
  if(!q)return '<h2>Review the current learning route</h2>';
  const {e,button}=ui;
  return `<div class="eyebrow">A COURSE TRANSFER</div><h2>Transfer to ${e(q.schoolName)}?</h2><p>From ${e(EDUCATION_LABELS[q.from])} · at ${e(q.siteName)}.</p><p>${e(q.explanation)}</p><p><strong>${q.days} day · ${q.cost} gold</strong>. ${q.annualLessons}/8 lessons and ${q.annualRevisions}/2 revisions already used this year.${q.examinedYear===undefined||q.examinedYear===null?'':` Last completed examination: age ${q.examinedYear}.`}</p>${q.disabledReason?`<p class="disabled-reason">${e(q.disabledReason)}</p>`:''}<div class="modal-buttons">${button(q.returning?'Return to this course':'Confirm transfer','school-transfer-confirm',q.to,'primary',!!q.disabledReason)}${button('Keep my current course','close-modal','','ghost')}</div>`;
}
