import { isSettlement } from './world.js';
import { MATERIAL_PRICES, materialValue, gearSaleValue } from './economy-values.js';
import { professionAnnualWage, professionWage } from './careers.js';
import { householdCostPreview, annualWorkRatio } from './budget.js';
import { COMMUNITY_CATALOG } from './community.js';
import { GEAR_CATALOG, ownedGear } from './gear.js';
import { ARTISAN_PATTERNS } from './workshop.js';

export const ECONOMY_GOALS = [{id:'artisan',name:'A three-piece artisan kit'},...['garden','road','learning','archive'].map(id=>({id,name:COMMUNITY_CATALOG.find(c=>c.id===id).name}))];
const sumMaterials=rows=>{const m={};for(const r of rows)for(const [id,n]of Object.entries(r))if(Object.hasOwn(MATERIAL_PRICES,id))m[id]=(m[id] || 0)+n;return m;};
export function economyPlan(s,goalId='road') {
  const goal=ECONOMY_GOALS.find(g=>g.id===goalId) || ECONOMY_GOALS[2],annual=householdCostPreview(s,365),activeLife=s.phase!=='retired'&&s.hero.alive!==false,canEarn=s.age>=18&&activeLife;
  const rate=professionAnnualWage(s)*annualWorkRatio(s),ordinary=canEarn?Math.floor((s.day+365)*rate/365)-Math.floor(s.day*rate/365):0;
  const wage=s.careers?.batch?.kind==='work'?s.careers.batch.wage:professionWage(s);
  const annualLiving=activeLife?annual.additionalCost:0,dedicated=activeLife&&s.age>=16?Math.floor(wage*365/3):0,net=ordinary-annualLiving;
  const m=s.realm?.sites?.[s.locationId]?.merchant,canSell=!!m&&isSettlement(s.world,s.locationId);
  const gear=canSell?ownedGear(s).filter(i=>!i.stolen&&!Object.values(s.equipment.equipped).includes(i.id)):[];
  const sales=gear.reduce((n,i)=>n+gearSaleValue(i,m),0)+(canSell?(s.adventuring?.loot || []).filter(l=>!l.stolen).reduce((n,l)=>n+Math.floor(l.value*.8),0):0);
  let fees=0,days=0,materials={},purpose='',annualMaintenance=0,committedGold=0,actionId=null,siteId=s.locationId;
  if(goal.id==='artisan') {
    const pattern=s.workshop?.patterns?.[0] || 'duelist',learned=s.workshop?.patterns?.includes(pattern),pieces=['leather_gloves','field_helm','iron_ring'].map(id=>GEAR_CATALOG.find(i=>i.id===id));
    const remaining=pieces.filter(piece=>!ownedGear(s).some(i=>i.crafted&&i.baseId===piece.id&&i.affix===pattern));
    fees=(learned?0:120)+remaining.reduce((n,i)=>n+i.recipe.gold+120,0);days=(learned?0:5)+remaining.reduce((n,i)=>n+i.craftDays+2,0);
    materials=sumMaterials(remaining.map(i=>({...i.recipe,crystal:(i.recipe.crystal || 0)+2,cloth:(i.recipe.cloth || 0)+1})));
    const project=s.workshop?.project;
    if(project&&(project.kind==='pattern'&&project.targetId===pattern||project.kind==='fitted'&&project.pattern===pattern&&remaining.some(i=>i.id===project.targetId))){siteId=project.locationId;committedGold=project.cost;fees-=project.cost;days-=project.totalDays-project.remainingDays;for(const [id,n]of Object.entries(project.materials))materials[id]=Math.max(0,(materials[id] || 0)-n);}
    purpose=`${ARTISAN_PATTERNS.find(p=>p.id===pattern).name} gloves, helm and ring: three different slots with sound quality and a chosen pattern. Requires crafting 3 and a tier 2 workbench. Stronger rare equipment remains dungeon loot.`;
  } else {
    const catalog=COMMUNITY_CATALOG.find(c=>c.id===goal.id),p=s.community?.project?.kind===goal.id?s.community.project:null;
    siteId=p?.locationId || s.locationId;
    const standing=s.community?.works?.find(w=>w.kind===goal.id&&w.locationId===siteId&&w.status==='standing');
    if(standing){const full=standing.operatingBalance>=6000;fees=full?0:1500;days=full?0:4;purpose=full?'The protected reserve already holds at least 6000 gold; no further contribution is currently offered. Services follow the actual charter and funded periods.':'This institution already exists. The next optional reserve contribution is 1500 gold; services follow its actual charter and funded periods.';annualMaintenance=standing.annualCost;actionId=full?null:`community_fund_${standing.id}`;}
    else {const stages=p?.stages || catalog.stages;committedGold=p?.paidGold || 0;fees=stages.reduce((n,r)=>n+r.cost,0)-committedGold;days=stages.reduce((n,r)=>n+r.days,0)-(p?.workedDays || 0);const total=sumMaterials(stages.map(r=>r.materials));materials=Object.fromEntries(Object.entries(total).map(([id,n])=>[id,Math.max(0,n-(p?.paidMaterials?.[id] || 0))]).filter(([,n])=>n>0));purpose=catalog.purpose+' The final milestone protects about ten years of operating funds; future maintenance is voluntary.';annualMaintenance=catalog.annualCost;actionId=p?(p.commitment?'community_continue':'community_stage'):`community_begin_${goal.id}`;}
  }
  purpose=`${s.world?.locations?.find(p=>p.id===siteId)?.name || siteId}: ${purpose}`;
  const shortfall=Object.fromEntries(Object.entries(materials).map(([id,n])=>[id,Math.max(0,n-(s.equipment?.materials?.[id] || 0))]).filter(([,n])=>n>0));
  // Cooperative purchases are packs of three. Spare inputs remain in the bag.
  const purchases=Object.fromEntries(Object.entries(shortfall).map(([id,n])=>[id,Math.ceil(n/3)*3]));
  const materialCash=materialValue(purchases),living=activeLife?householdCostPreview(s,days).additionalCost:0,total=fees+materialCash+living;
  const spendable=Math.max(0,s.hero.gold-annual.outstanding),gap=Math.max(0,total-spendable);
  return {goal,siteId,purpose,ordinary,dedicated,annualLiving,net,dedicatedNet:dedicated-annualLiving,outstanding:annual.outstanding,spendable,sales,fees,days,materials,shortfall,purchases,materialCash,living,total,gap,afterSaleGap:Math.max(0,gap-sales),years:net>0?Math.ceil(gap/net):null,annualMaintenance,committedGold,actionId};
}
export function renderEconomyPlan(s,ui,{goal='road'}={}) {
  const v=economyPlan(s,goal),{e,button}=ui;
  const inputs=Object.entries(v.purchases).map(([id,n])=>`${n} ${id}`).join(', ') || 'no new material purchases';
  return `<details class="panel economy-plan" data-disclosure="economy-plan" open><summary>Savings, trade &amp; a wanted goal</summary><p class="small-copy">${s.phase==='retired'?'This life is closed; no future wages or living costs are projected. ':''}Ordinary Age up and dedicated work are alternative schedules. Forecasts use current wages, household priorities and upkeep; birthdays and choices can change them.</p><div class="career-stats"><div><span>Ordinary year, net</span><strong>${v.net>=0?'+':''}${v.net}g</strong><small>${v.ordinary} income − ${v.annualLiving} living costs</small></div><div><span>365 dedicated work days, net</span><strong>${v.dedicatedNet>=0?'+':''}${v.dedicatedNet}g</strong><small>${v.dedicated} agreed-rate wages − ${v.annualLiving} living costs</small></div><div><span>Optional local sale quote</span><strong>${v.sales}g</strong><small>Owned, unequipped gear and ordinary loot</small></div></div><nav class="craft-filters" aria-label="Savings goal">${ECONOMY_GOALS.map(g=>`<button type="button" class="button secondary small ${g.id===v.goal.id?'active':''}" data-op="economy-goal" data-id="${g.id}" aria-pressed="${g.id===v.goal.id}">${e(g.name)}</button>`).join('')}</nav><h3>${e(v.goal.name)}</h3><p>${e(v.purpose)}</p><p>${v.fees} gold in remaining fees${v.committedGold?` (${v.committedGold} already committed)`:''} + ${v.materialCash} gold to buy ${e(inputs)} + about ${v.living} living costs over ${v.days} work days = <strong>${v.total} gold remaining</strong>.</p><p class="small-copy">${v.spendable} gold available after ${v.outstanding} already-accrued household costs. Savings gap ${v.gap} gold; selling the quoted belongings would reduce it to ${v.afterSaleGap}.${v.gap&&v.years!==null?` At the present ordinary-year surplus: about ${v.years} more years.`:v.gap?' This living plan has no surplus; extra work, trade or different priorities can fund the gap.':''} Gathering can replace purchases with actual work; travel, gathering days and future changes are outside this purchase forecast. Cooperative packs leave unused materials in your bag.</p>${v.annualMaintenance?`<p class="small-copy">Protected operation uses ${v.annualMaintenance} gold per funded year; this expense belongs to the institution’s reserve and is separate from your home’s upkeep.</p>`:''}<div class="quick-actions">${button('Find the Local Market','economy-merchant','','ghost small')}${button('Find a Craftsperson','place-open','','ghost small')}</div>${v.actionId?`<p class="small-copy">Use the community charter or saved milestone below to commit work. Selecting a savings goal spends nothing.</p>`:''}</details>`;
}
