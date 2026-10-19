const labels = Object.freeze({ scout: 'Guide the disarming', protector: 'Brace the crossing', scholar: 'Share the close reading', healer: 'Dress a small wound' });
export const mazeFieldAssistLabel = kind => labels[kind] || 'Companion help';
export function mazeFieldAssistReceiptText(row) {
  const target = row.targetPerson?.name || row.actorName;
  const effect = row.kind === 'scholar' ? `${target} Focus ${row.target.mp} → ${row.targetFocusAfter}`
    : `${target} Health ${row.target.hp} → ${row.targetHpAfter}`;
  return `${row.helperPerson.name} · generation ${row.actorGeneration}: ${mazeFieldAssistLabel(row.kind)}. Personal Focus ${row.helper.mp} → ${row.helperFocusAfter} (${row.focusCost} spent)${row.herbCost ? `; herbs ${row.herbsBefore} → ${row.herbsAfter} (${row.herbCost} spent)` : ''}. ${effect}${['scout','protector'].includes(row.kind) ? `; alone ${row.aloneDamage} injury, assisted ${row.damage}` : ''}.`;
}

/** One exact description used by native current-room controls and the accepted
 * Journal entry. These field adaptations are not new effects of combat spells. */
export function describeMazeFieldAssist(q) {
  if (q.disabledReason) return 'No resources spent. ' + q.disabledReason;
  const cost = `${q.helperName} spends ${q.focusCost} personal Focus (${q.helperFocus} → ${q.helperFocusAfter})${q.herbCost ? ` and ${q.herbCost} herb bundle (${q.herbs} → ${q.herbs - q.herbCost})` : ''}.`;
  let result;
  if (q.kind === 'scout' || q.kind === 'protector') result = `Alone: lose ${q.aloneDamage} Health. With help: lose ${q.damage} Health (${q.targetHp} → ${q.targetHpAfter}).`;
  else if (q.kind === 'scholar') result = `Your Focus ${q.targetFocus} → ${q.targetFocusAfter} (+${q.focusGain}); read this same inscription once into Journal Archive, with no Scholarship or experience gain. ${q.notebookCopyNotice || 'An editable personal copy is kept only if this life’s notebook has room; no existing note is replaced.'}`;
  else result = `${q.targetName}: Health ${q.targetHp} → ${q.targetHpAfter} (+${q.hpGain}). No revival or cleansing; potions remain separate.`;
  return `${cost} ${result}${q.mastery ? ` Their own chapter ${q.mastery.chapter} qualifies this experienced field adaptation; it does not change the combat technique.` : ''} No calendar time. Uses this room’s one companion-help slot.`;
}

/** No helper is selected implicitly: each native button names both source and
 * (for care) target. Reusing an old local role ID never renames the recorded
 * original person in the used-slot disclosure. */
export function renderMazeFieldAssists(s, actions, { e, button }) {
  const used = s.maze?.fieldAssists?.entries.find(row => row.cellId === s.maze.position);
  const offers = actions.filter(a => a.id.startsWith('maze_assist_'));
  if (!offers.length && !used) return '';
  const history = used ? `<p class="small-copy" data-maze-assist-used>Companion help already used here: ${e(used.helperPerson.name)} · generation ${used.actorGeneration} · ${e(mazeFieldAssistLabel(used.kind))}. This records that person’s own help, not a later companion with the same role.</p>` : '';
  return `<section class="maze-field-assists" aria-labelledby="maze-field-assists-title"><h3 id="maze-field-assists-title" tabindex="-1">Companion help</h3><p class="small-copy">Choose who helps. One paid assistance per physical room, across visits and lives; no passive party bonuses.</p>${history}${offers.map(a => `<div class="field-assist" data-maze-assist="${e(a.id)}"><p class="small-copy">${e(a.description)}</p>${button(e(a.label), 'activity', a.id, 'secondary small', Boolean(a.disabledReason))}${a.disabledReason ? `<p class="disabled-reason">${e(a.disabledReason)}</p>` : ''}</div>`).join('')}</section>`;
}
