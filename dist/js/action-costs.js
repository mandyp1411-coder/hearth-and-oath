import { householdCostPreview } from './budget.js';

const amount=value=>Number.isFinite(value)&&value>=0?value:null;
const materialName=id=>String(id).replace(/_/g,' ');

// A display-only view of the engine's current offer. Quoted commitment fields
// take precedence over the immediate wrapper action; never add living costs to
// the fee or use this preview to decide affordability or spend resources.
export function actionCostView(s,a={}) {
 const days=amount(a.durationDays??a.days),fee=amount(a.quotedCost??a.cost);
 const materials=Object.entries(a.materials||{}).filter(([,n])=>Number.isFinite(n)&&n>0).map(([id,n])=>({id,amount:n,name:materialName(id)}));
 const household=s?.householdBudget&&s.life&&Number.isFinite(s.day)&&days!==null?householdCostPreview(s,days):null;
 return {days,fee,materials,household,timeDescription:a.timeDescription||''};
}
export function actionCostSummary(s,a={}) {
 const q={days:amount(a.durationDays??a.days),fee:amount(a.quotedCost??a.cost)};
 return [q.days===null?'':q.days?`${q.days} Day${q.days===1?'':'s'}`:'No Time',q.fee===null?'':q.fee?`${q.fee} Gold Fee`:'No Fee'].filter(Boolean).join(' · ');
}
const accrualText=q=>q.days>0&&q.household?`Household estimate: +${q.household.additionalCost} Gold accrues over this time; settled separately from the fee.`:'';
export function householdAccrualText(s,a={}) {return accrualText(actionCostView(s,a));}
export function actionCostDetails(s,a={}) {
 const q=actionCostView(s,a);
 return [q.timeDescription,q.materials.length?'Materials: '+q.materials.map(m=>`${m.amount} ${m.name}`).join(', ')+'.':'',accrualText(q)].filter(Boolean).join(' ');
}
export function renderActionCostHelp(s,{e},key='action-costs') {
 const accrued=s?.householdBudget&&s.life?householdCostPreview(s,0).outstanding:0;
 return `<details class="action-cost-help" data-disclosure="${e(key)}"><summary>How time &amp; costs work</summary><p class="small-copy">The fee is the action’s direct Gold cost; materials and consumed supplies are separate. Use the action description and review for its specific requirements; an unlisted material is not a promise that none is needed. “No Fee” does not mean no supplies or household costs. Some choices open a review before anything is spent. Days show the full action or remaining commitment; journey forecasts estimate travel without further rest. Birthdays and other interruptions can pause attendance.</p><p class="small-copy">Expected household living costs accrue only as adult days actually pass. They may be settled when an action finishes, during Age up or when a life closes. They are accounted for separately from the provider fee and materials, not combined into an all-inclusive price. An interrupted action accrues only for the days attended.${accrued?` ${accrued} Gold has already accrued and is separate from these estimates.`:''}</p></details>`;
}
