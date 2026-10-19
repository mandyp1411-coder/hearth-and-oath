import { GEAR_STATS, GEAR_STAT_NAMES, BUILD_GOALS, buildFit } from './gear-comparison.js';
import { SLOT_NAMES } from './gear-loot.js';

const signed=n=>`${n>0?'+':''}${Number(n.toFixed(1))}`;
export function bonusText(values) { return Object.entries(values).filter(([,n])=>n).map(([key,n])=>`${GEAR_STAT_NAMES[key]||key} ${signed(n)}`).join(' · ')||'No equipment bonuses'; }
export function renderEquipmentComparison(c,{e},{purchase=false,goal='none'}={}) {
  if(!c)return '';
  return renderLoadoutComparison(c,{e},{goal,id:c.id,label:c.item.name,context:purchase?'If bought and equipped. Buying leaves your loadout unchanged.':c.removing?'After unequipping:':'After equipping:'});
}
export function renderLoadoutComparison(c,{e},{goal='none',id=c?.id,label='saved loadout',context='After applying this loadout:',preset=false}={}) {
  if(!c)return '';
  const changes=c.changes.map(change=>`${SLOT_NAMES[change.slot]}: ${change.before?.name||'Empty'} → ${change.after?.name||'Empty'}`).join('. ');
  const delta=Object.fromEntries(GEAR_STATS.filter(key=>c.delta[key]).map(key=>[key,c.delta[key]]));
  const setLines=c.setChanges.map(set=>{
    const thresholds=set.thresholds.filter(t=>t.beforeActive!==t.afterActive).map(t=>`${t.afterActive?'Gain':'Lose'} ${t.count}-piece bonus (${bonusText(t.bonuses)})`);
    const next=set.thresholds.find(t=>!t.afterActive);
    return `${set.name}: ${set.beforeCount} → ${set.afterCount} pieces. ${thresholds.join('. ')}${thresholds.length?'. ':''}${next?`Next threshold: ${next.count} pieces (${bonusText(next.bonuses)}).`:''}`;
  });
  const fit=buildFit(c,goal),preference=BUILD_GOALS.find(g=>g.id===goal);
  const combatNames={weapon:'Weapon power',arcane:'Arcane power',sacred:'Sacred power',armor:'Effective armor',initiative:'Initiative'};
  return `<section class="equipment-comparison" id="equipment-comparison-${e(id)}" ${preset?'data-loadout-preview':'data-equipment-preview'}="${e(id)}" aria-label="Equipment comparison for ${e(label)}"><p class="comparison-context">${e(context)}</p><p class="small-copy">${e(changes||(preset?'This complete loadout is already equipped.':'This piece is already equipped.'))}</p><p class="comparison-delta"><strong>Full loadout change:</strong> ${e(Object.keys(delta).length?bonusText(delta):'No equipment bonus change.')}</p>${setLines.map(line=>`<p class="set-change" data-set-change>${e(line)}</p>`).join('')}${preference?`<p class="small-copy">${e(preference.name)} preference: ${fit>0?'favors this change':fit<0?'favors your current loadout':'no weighted advantage'}. Other goals can prefer different gear.</p>`:''}<details><summary>Full totals and combat effect</summary><div class="equipment-table-wrap"><table class="equipment-compare-table"><caption>Equipment bonuses, including active sets</caption><thead><tr><th scope="col">Stat</th><th scope="col">Now</th><th scope="col">After</th><th scope="col">Change</th></tr></thead><tbody>${GEAR_STATS.map(key=>`<tr><th scope="row">${GEAR_STAT_NAMES[key]}</th><td>${c.before.bonuses[key]}</td><td>${c.after.bonuses[key]}</td><td>${signed(c.delta[key])}</td></tr>`).join('')}</tbody></table></div><p class="small-copy">Loadout gear score ${c.before.score} → ${c.after.score} (${signed(c.scoreDelta)}). Score summarizes item stats and excludes set bonuses; totals above include them.</p><dl class="combat-equipment-values">${Object.entries(combatNames).map(([key,label])=>`<div><dt>${label}</dt><dd>${c.before.combat[key]} → ${c.after.combat[key]}</dd></div>`).join('')}</dl><p class="small-copy">Power is shown before the target’s armor, wards and resistance. Armor and initiative cannot fall below 0 and 1. Training and base attributes stay unchanged; equipment applies to the next encounter.</p></details></section>`;
}
