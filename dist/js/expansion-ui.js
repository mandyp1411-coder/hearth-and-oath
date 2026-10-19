import { getActions, getLifeCommitment } from './engine.js';
import { societyView } from './society.js';
import { communityView } from './community.js';
import { fellowshipView } from './fellowship.js';
import { sanctuaryView } from './sanctuaries.js';
import { compatibilityView } from './family-depth.js';
import { adoptionView } from './lineage.js';
import { educationDepthView } from './household.js';
import { renderAvatar } from './avatar.js';

const place=(s,id)=>s.world.locations.find(p=>p.id===id)?.name||id;
const actions=(s,prefix)=>getActions(s).filter(a=>a.id.startsWith(prefix));
const archive=(ui,id,label,records)=>records?.length?`<details class="construction-section" data-disclosure="${ui.e(id)}"><summary>${ui.e(label)}</summary>${ui.historyList(records.slice(-12))}</details>`:'';
function locationLink(s,id,ui){return id&&id!==s.locationId?ui.button(`Find ${ui.e(place(s,id))} on the map`,'quest-location',id,'ghost small'):'';}

export function commitmentPanel(s,ui) {
  const c=getLifeCommitment(s);if(!c)return '';
  const {e,meter,actionCards}=ui, offered=actions(s,c.kind+'_');
  if(c.kind==='recovery'){
    const p=s.health.recovery;
    return `<section class="panel experience-commitment" data-recovery-commitment><div class="eyebrow">TIME RESERVED FOR CARE</div><h2>${e(c.title)}</h2><p>⌖ ${e(place(s,c.locationId))} · ${e(c.remainingDays)} days remain</p>${meter(c.completedDays,c.totalDays,'Plan attendance')}<p class="small-copy">${p.careDays==null?'Earlier symptom-care days were not separately recorded.':`${e(p.careDays)} symptom-care days separately recorded.`} Symptom improvement has separate care and wellbeing checks; other treatment does not finish these reserved days.</p>${ui.button('Review health &amp; care','tab','health','secondary small')}${offered.length?actionCards(offered):'<p class="care-support">The plan and its remaining days are saved. Resolve the waiting decision before continuing.</p>'}</section>`;
  }
  return `<section class="panel experience-commitment"><div class="eyebrow">UNFINISHED WORK</div><h2>${e(c.title)}</h2><p>⌖ ${e(place(s,c.locationId))} · ${e(c.remainingDays)} days remain</p>${meter(c.completedDays,c.totalDays||1,'Committed days completed')}${offered.length?actionCards(offered):'<p class="care-support">The work can wait until this moment has passed.</p>'}</section>`;
}

export function societyPanel(s,ui) {
  if(!s.society||s.age<16)return '';
  const v=societyView(s),{e,button,title,actionCards}=ui;
  const card=p=>`<article class="panel society-person"><div class="badge-row"><span class="badge">${e(title(p.role))}</span><span class="badge">${p.alive===false?'Remembered':e(title(p.status))}</span></div><h3>${e(p.name)}</h3><p>${e(p.profession)} · ${e(p.age)} years · ${e(p.locationName||place(s,p.locationId))}</p><p>${e(p.goal)}</p>${p.memories?.length?`<p class="small-copy">“${e(p.memories.at(-1))}”</p>`:''}${button('Read their correspondence','show-contact',p.id,'secondary small')}${locationLink(s,p.locationId,ui)}</article>`;
  return `<section class="roleplay-section"><div class="section-heading"><div><span class="eyebrow">THE FAMILIAR FACES</span><h2>Neighbors &amp; colleagues</h2></div><span class="badge">${v.people.length} known</span></div>${actionCards(actions(s,'society_'))}${v.people.length?`<div class="career-grid">${v.people.slice(0,6).map(card).join('')}</div>${v.people.length>6?`<details class="construction-section" data-disclosure="other-neighbors"><summary>More customers, colleagues and neighbors</summary><div class="career-grid">${v.people.slice(6).map(card).join('')}</div></details>`:''}`:'<p class="care-support">Your first customers and colleagues have yet to cross the threshold.</p>'}${v.remembered?.length?`<details class="construction-section" data-disclosure="remembered-neighbors"><summary>Lives remembered · ${v.remembered.length}</summary><div class="career-grid">${v.remembered.slice(-12).map(card).join('')}</div></details>`:''}${archive(ui,'society-history','Old letters and shared work',v.history)}</section>`;
}

export function compatibilityPanel(s,person,ui) {
  if(!person)return '';
  const v=compatibilityView(s,person.id),{e,actionCards}=ui;
  const offered=actions(s,'life_values_').filter(a=>a.id===v.discussActionId);
  if(!v.enabled&&!offered.length)return '';
  return `<section class="panel relationship-values"><div class="eyebrow">SMALL THINGS YOU KNOW</div><h3>${e(person.name)}’s tastes</h3>${v.known.length?`<div class="known-preferences">${v.known.map(k=>`<div><span>${e(k.label)}</span><strong>${e(k.value)}</strong><small>${k.shared?'You share this taste':`You favor ${e(k.yourValue)}`}</small></div>`).join('')}</div>`:'<p class="muted">You have not spoken about these things yet.</p>'}${actionCards(offered)}</section>`;
}

export function communityPanel(s,ui,compact=false) {
  if(!s.community||s.age<18&&!s.community.works.length)return '';
  const v=communityView(s),{e,title,button,actionCards,meter,date}=ui;
  const own=actions(s,'community_');
  const card=w=>`<article class="panel community-work"><div class="badge-row"><span class="badge">${e(title(w.kind))}</span><span class="badge ${w.operating?'':'warning'}">${e(w.operation.label)}</span></div><h3>${e(w.name)}</h3><p>⌖ ${e(w.siteName)} · Founded by ${e(w.founderName)}</p><p class="small-copy" data-institution-operation>${e(w.operation.description)}</p><p>${e(w.scopeDescription)}</p><div class="inheritance-list"><div><span>Protected reserve</span><strong>${e(w.operatingBalance)}g</strong></div><div><span>Funded through</span><strong>${e(date(w.fundedUntil))}</strong></div></div><p class="small-copy">${e(w.beneficiaries.filter(p=>p.alive).map(p=>p.name).join(' · ')||'The charter preserves earlier participants.')}</p>${w.originName?`<p>In remembrance of ${e(w.originName)}. Its lost history remains.</p>`:''}${actionCards(own.filter(a=>a.id.endsWith('_'+w.id)))}${locationLink(s,w.locationId,ui)}</article>`;
  const p=v.project;
  return `<section class="roleplay-section community-section"><div class="section-heading"><div><span class="eyebrow">A FUTURE BEYOND YOUR OWN WORK</span><h2>${e(v.title)}</h2></div><span class="badge">${v.works.length} works</span></div><p>A schoolhouse, a quiet ward, a refuge. Lay the foundations and put something aside to keep its doors open.</p>${p?`<section class="panel community-ambition"><h3>${e(p.name)}</h3><p>⌖ ${e(place(s,p.locationId))} · Milestone ${p.step+1}/3 · ${e(p.paidGold)}g committed</p>${meter(p.step,3,'Completed milestones')}<p>${e(p.beneficiaries.map(r=>r.name).join(' · '))}</p>${actionCards(own.filter(a=>!a.id.startsWith('community_review_')&&!a.id.startsWith('community_fund_')))}${locationLink(s,p.locationId,ui)}</section>`:own.some(a=>a.id.startsWith('community_begin_'))?`<details class="construction-section" data-disclosure="community-ambitions" ${!v.works.length&&!compact?'open':''}><summary>Choose a lasting ambition</summary>${actionCards(own.filter(a=>a.id.startsWith('community_begin_')))}</details>`:''}${v.works.length?`<div class="career-grid">${v.works.slice(0,compact?3:24).map(card).join('')}</div>`:''}${!compact?archive(ui,'community-history','In the charter book',v.history):''}</section>`;
}

export function fellowshipPanel(s,ui,scope='all') {
  if(!s.fellowship||s.age<16&&!s.fellowship.inherited.length)return '';
  const v=fellowshipView(s),{e,title,actionCards,date}=ui,own=actions(s,'fellowship_');
  const formations=scope==='companions'?[]:v.formations,companions=scope==='formations'?[]:v.companions;
  const inherited=v.inherited.filter(r=>scope==='companions'?r.kind==='companion':scope==='formations'?r.kind==='formation':true);
  const offered=own.filter(a=>{
    if(['fellowship_continue','fellowship_withdraw'].includes(a.id))return scope==='all'||v.project?.kind===(scope==='companions'?'companion':'formation');
    return scope==='companions'?a.id.startsWith('fellowship_companion_'):scope==='formations'?!a.id.startsWith('fellowship_companion_'):true;
  });
  if(!offered.length&&!formations.length&&!companions.length&&!inherited.length)return '';
  const stages={field:'Inquiry in progress',decision:'A decision to make',practice:'Living the agreement',review:'Ready for mentor review',attest:'Recognition in progress',completed:'Recognized',withdrawn:'Left unfinished',request:'A request heard',finalize:'Keeping the agreed answer',declined:'An honest refusal'};
  const interpretations={access:'Accessible escape routes',accountability:'A named watch responsibility',restraint:'A stop signal shared by the team',rotation:'A trained rescue rotation',petition:'A witnessed challenge to the order','shared-duty':'A negotiated shared escort',sanctuary:'Sanctuary without compulsory disclosure',reform:'An accountable consent rule',consent:'Care chosen by the patient',advocacy:'An answer for earlier imposed treatment',redesign:'A safer shared grounding route',disclose:'A corrected public inspection',adapt:'A crossing that protects access and habitat',seasonal:'A seasonal maintenance bargain',release:'Testimony with an honored release','living-proof':'Evidence from the living',restitution:'A witnessed return of wages',evidence:'Evidence controlled by the workers',accessible:'An accessible route with honest costs','local-guides':'Local guides named for their knowledge',refuse:'A refused commission and a warning',expose:'False evidence preserved for an advocate','private-verse':'Private grief kept private','shared-authorship':'A memorial with shared authorship'};
  const outcomes={neighborhood:'Resident-led protection','order-agreement':'An accountable protection rota','shared-rota':'A clinic rota with protected rest','teach-relief':'Willing relief staff trained and credited','private-letter':'A private letter, with no reunion demanded','careful-record':'A careful record, with uncertainty preserved'};
  const formationCard=f=>`<article class="panel formation-card"><span class="badge">${e(stages[f.stage]||title(f.stage))}</span><h3>${e(f.title)}</h3><p>${e(f.name)} · Original mentor ${e(f.mentorName)}${f.supervisor&&f.supervisor.id!==f.mentorId?' · Current supervisor '+e(f.supervisor.name):''} · ${e(place(s,f.locationId))}</p>${f.approach?`<p>${f.approach==='service'?'A named community service promise':'An independent supervised practice'}</p>`:''}<p>${e(f.workDays)} of ${e(f.totalDays)} days completed</p>${f.interpretation?`<p>${e(interpretations[f.interpretation]||title(f.interpretation))}</p>`:''}${f.technique?`<p><strong>${e(f.technique)}</strong> · ${f.recognition==='public'?'Public, credited recognition':'A private signed account'}</p><p class="small-copy">Recognized ${e(date(f.completedDay))}</p>`:''}${f.stage!=='completed'?locationLink(s,f.locationId,ui):''}</article>`;
  const companionCard=p=>`<article class="panel companion-story"><span class="badge">${e(p.stage==='completed'?'Shared work completed':p.stage==='field'?'Shared work in progress':stages[p.stage]||title(p.stage))}</span><h3>${e(p.name)}</h3><p>${p.id==='mira'?'Protection with clear responsibilities':p.id==='orrin'?'Care with room for rest':`An honest account of ${e(p.subjectName)}’s route`}</p>${p.approach?`<p>${p.approach==='promise'?'A request with a named deadline':'A clear offer without an extra deadline'}</p>`:''}<p>${e(p.workDays)} of ${e(p.totalDays)} shared days completed</p>${p.resolution?`<p>${e(outcomes[p.resolution]||title(p.resolution))}</p>`:''}${p.boundary?`<p class="care-support">${e(p.boundary)}</p>`:''}${p.completedDay!==null?`<p class="small-copy">Completed ${e(date(p.completedDay))}</p>`:''}</article>`;
  return `<section class="roleplay-section fellowship-section"><div class="section-heading"><div><span class="eyebrow">${scope==='companions'?'LIVES BESIDE YOUR OWN':'A DISCIPLINE LIVED THROUGH WORK'}</span><h2>${scope==='companions'?'What your companions ask of you':scope==='formations'?'Beyond the first initiation':'Practices and promises'}</h2></div></div>${s.age>=18?`<p>${scope==='companions'?'Ask what has been on their mind. There may be something you can do together.':'Your mentor has work in mind. A discipline asks more than knowing the motions.'}</p>`:''}${actionCards(offered)}${formations.length?`<div class="career-grid">${formations.map(formationCard).join('')}</div>`:''}${companions.length?`<div class="career-grid">${companions.map(companionCard).join('')}</div>`:''}${inherited.length?`<details class="construction-section" data-disclosure="fellowship-inherited-${e(scope)}"><summary>Practices and friendships remembered by your family</summary>${inherited.slice(-12).map(r=>`<article><h3>${e(r.name)}</h3><p>${e(r.summary)}</p><p class="small-copy muted">${e(date(r.day))} · ${r.kind==='formation'?'An earlier life’s earned practice':'An earlier life’s shared commitment'}</p></article>`).join('')}</details>`:''}</section>`;
}

export function schoolDepthPanel(s,ui) {
  const v=educationDepthView(s);if(!v.enabled)return '';
  const {e,title,date}=ui;
  return `<section class="panel school-depth"><div class="eyebrow">WHAT YOUR LEARNING IS FOR</div><h2>${e(v.academicPath)}</h2><p>Lessons, examinations and work carried home.</p>${v.projects.length?`<div class="learning-project-records">${v.projects.map(p=>`<article><h3>${e(p.title||title(p.id))}</h3><p>${e(p.outcome||p.choice||p.approach||'A completed piece of school work')} · ${e(date(p.day||p.completedDay))}</p></article>`).join('')}</div>`:''}${v.teacherHistory.length?`<details class="construction-section" data-disclosure="teacher-retirements"><summary>Teachers whose work is remembered</summary>${v.teacherHistory.map(p=>`<p>${e(p.name)} · ${e(title(p.route))} · retired ${e(date(p.retiredDay))}</p>`).join('')}</details>`:''}</section>`;
}

export function adoptionPanel(s,ui) {
  const v=adoptionView(s);if(!v.enabled||s.age<18)return '';
  const {e,title,actionCards}=ui;
  const offered=actions(s,'lineage_adoption_');
  return `<section class="roleplay-section adoption-section"><div class="section-heading"><div><span class="eyebrow">A CHILD ALREADY HAS A LIFE</span><h2>Offer a home. Hear their wishes.</h2></div></div><p>Meet an older child and their keeper, listen before making an offer, and prepare a home only if they agree. Their name, age, earlier learning and friendships remain theirs.</p>${actionCards(offered)}${v.candidates.length?`<div class="heir-grid">${v.candidates.map(c=>`<article class="panel adoption-candidate"><div class="heir-heading">${renderAvatar(c,{size:'small',age:c.age})}<div><h3>${e(c.name)}</h3><small>Age ${e(c.age)} · ${e(title(c.status))}</small></div></div><p>${e(c.circumstance)}</p><p>Keeper: ${e(c.guardianName)}</p><p>${c.consent===true?'Their agreement has been heard and recorded.':c.consent===false?'Their wish to remain has been heard and respected.':'Their own wishes still need to be heard.'}</p>${c.learning?.qualifications?.length?`<p>${e(c.learning.qualifications.map(q=>q.label).join(' · '))}</p>`:''}</article>`).join('')}</div>`:''}${archive(ui,'adoption-history','Meetings, consent and earlier learning',v.history)}</section>`;
}

export function sanctuaryPanel(s,ui,scope='all') {
  if(!s.sanctuaries||s.age<16)return '';
  const v=sanctuaryView(s),{e,title,actionCards,date}=ui;
  const own=actions(s,'sanctuary_'),cases=scope==='conditions'?[]:v.cases,agreements=scope==='law'?[]:v.agreements,plans=scope==='law'?[]:v.plans;
  const offered=own.filter(a=>scope==='law'?/case|review|advoca|legal|continue|cancel/.test(a.id):scope==='conditions'?!/case|review|advoca|legal/.test(a.id):true);
  if(!offered.length&&!cases.length&&!agreements.length&&!plans.length)return '';
  return `<section class="roleplay-section sanctuary-section"><div class="section-heading"><div><span class="eyebrow">A PLACE TO TURN</span><h2>${scope==='law'?'An accusation and a way forward':'Ways to live with the changed life'}</h2></div></div>${actionCards(offered)}${cases.map(c=>`<article class="panel local-case"><span class="badge ${c.status==='resolved'?'':'warning'}">${e(title(c.status))}</span><h3>${e(place(s,c.locationId))}</h3><p>${e(c.description)}</p><p>${e(c.evidence)} recorded evidence · ${e(title(c.resolution||'An answer is still possible'))}</p></article>`).join('')}${agreements.map(a=>`<article class="panel donor-agreement"><span class="badge">${e(title(a.availability||a.status))}</span><h3>${e(a.contactName)}</h3><p>${e(place(s,a.locationId))} · ${e(a.fee)}g per attended session · ${e(a.sessions)} sessions kept</p><p>${a.availability==='paused'?e(a.availabilityReason):a.status==='active'?`Next consent may be requested ${e(date(a.nextSessionDay))}.`:e(a.endReason||'The agreement has ended.')}</p></article>`).join('')}${plans.map(p=>`<article class="panel moon-agreement"><span class="badge">${e(title(p.availability||p.status))}</span><h3>${e(p.contactName||p.title||'A moon-watch circle')}</h3><p>⌖ ${e(place(s,p.locationId))} · ${e(title(p.kind||'household'))}</p><p>${p.availability==='paused'?e(p.availabilityReason):p.preparedMoon?`Prepared for the moon on ${e(date(p.preparedMoon))}.`:'Actual preparation remains to be done.'}</p></article>`).join('')}${archive(ui,'sanctuary-history','Earlier arrangements',v.history)}</section>`;
}
