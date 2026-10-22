// The field on the page (v0.68): two ranks a side, portraits with their bars
// and an intent glyph, the commands with what each would do, the log folded
// beneath. Reads the battle; never advances it. Legacy battles keep
// battle-ui.js. Portraits come from the caller, as battle-ui does it.
import { getBattleActions, previewBattleAction, battleActorDisplayName } from './combat.js';
import { renderCombatStatuses } from './combat-status-ui.js';
import { renderEnemyPortrait } from './enemies.js';
import { reaches } from './enemy-targets.js';

const GLYPH = { strike: '⚔', charge: '⚡', ward: '◈', hex: '✶', heal: '✚', volley: '⋯', flank: '⟡', measure: '◎', wait: '·' };
function intentGlyph(text = '') {
  const t = text.toLowerCase();
  if (/measure/.test(t)) return GLYPH.measure;
  if (/charge|winds up|prepared|ritual/.test(t)) return GLYPH.charge;
  if (/ward|regenerat|heal|restore|recover/.test(t)) return /heal|restore|recover/.test(t) ? GLYPH.heal : GLYPH.ward;
  if (/every|entire|all |wave|volley|pulse/.test(t)) return GLYPH.volley;
  if (/weaken|hex|seal|silence|fear|poison|bleed|mark/.test(t)) return GLYPH.hex;
  if (/pack|flank|prey/.test(t)) return GLYPH.flank;
  if (/strike|hit|attack|smash|drain/.test(t)) return GLYPH.strike;
  return GLYPH.wait;
}
const shortIntent = text => String(text || '').split(/(?<=[.!?])\s/)[0].slice(0, 90);

export function renderField(b, ui, { selectedEnemy = null, selectedAlly = null, portraitFor, outcomeContent = '', commandHelpFor = () => '' } = {}) {
  const { e, meter, chapter } = ui;
  const name = a => battleActorDisplayName(a, b), actor = b.actors.find(a => a.id === b.currentActorId), live = !b.outcome;
  const enemies = b.actors.filter(a => a.side === 'enemy' && a.hp > 0), allies = b.actors.filter(a => a.side === 'party' && a.hp > 0);
  if (!enemies.some(a => a.id === selectedEnemy)) selectedEnemy = enemies[0]?.id || null;
  if (!allies.some(a => a.id === selectedAlly)) selectedAlly = actor?.side === 'party' ? actor.id : allies[0]?.id || null;
  const actions = live ? getBattleActions(b).map(a => { const preview = previewBattleAction(b, a.id, a.targetSide === 'party' ? selectedAlly : selectedEnemy); return { ...a, preview, disabledReason: preview.legal ? null : preview.reason }; }) : [];
  const card = a => {
    const down = a.hp <= 0, mine = a.id === b.currentActorId, enemy = a.side === 'enemy';
    const reach = enemy && live && actor?.side === 'party' ? reaches(b, actor, a) : true;
    const intent = enemy && !down && a.intent ? `<p class="field-intent"><span class="field-glyph" aria-hidden="true">${intentGlyph(a.intent)}</span> ${e(shortIntent(a.intent))}</p>` : '';
    const pick = !down && live ? (enemy ? `<label class="field-pick"><input type="radio" name="battle-target" value="${e(a.id)}" ${selectedEnemy === a.id ? 'checked' : ''}> ${selectedEnemy === a.id ? 'Target' : 'Aim here'}</label>` : `<label class="field-pick"><input type="radio" name="battle-ally-target" value="${e(a.id)}" ${selectedAlly === a.id ? 'checked' : ''}> ${selectedAlly === a.id ? 'Chosen' : 'Help'}</label>`) : '';
    return `<div class="field-card ${enemy ? 'enemy' : 'ally'} ${mine ? 'current' : ''} ${down ? 'down' : ''} ${!reach ? 'out-of-reach' : ''}" data-actor="${e(a.id)}"><div class="field-portrait">${enemy ? renderEnemyPortrait({ ...a, name: name(a) }) : portraitFor(a)}${mine ? '<span class="field-turn" aria-label="Their move">▶</span>' : ''}</div><div class="field-body"><strong>${e(name(a))}</strong>${down ? '<span class="field-down">down</span>' : ''}${!reach && !down ? '<span class="field-reach" title="Out of reach of a plain blow">behind</span>' : ''}${meter(a.hp, a.maxHp, 'Health')}${a.maxMp ? meter(a.mp, a.maxMp, 'Focus', 'focus-meter') : ''}${renderCombatStatuses(a)}${a.status?.inspected && enemy ? `<p class="field-known">${a.weakness ? 'Fears ' + e(a.weakness) : 'Fears nothing you know of'}.</p>` : ''}${intent}${pick}</div></div>`;
  };
  const rank = (side, row) => { const rows = b.actors.filter(a => a.side === side && (a.row || 'front') === row); return rows.length ? `<div class="field-rank ${row}" aria-label="${side === 'enemy' ? 'Their' : 'Your'} ${row} rank"><span class="field-rank-label">${row === 'front' ? 'Front' : 'Back'}</span>${rows.map(card).join('')}</div>` : ''; };
  const commands = !live ? outcomeContent : `<div class="section-heading"><div><span class="eyebrow">YOUR MOVE</span><h2>${e(name(actor))}</h2></div><span class="badge">${b.potions} potion${b.potions === 1 ? '' : 's'}</span></div><div class="field-actions">${actions.map(a => `<div class="field-action"><button class="button ${a.id === 'attack' ? 'primary' : a.art ? 'art' : 'secondary'}" data-op="battle-action" data-id="${e(a.id)}" ${a.disabledReason ? 'disabled' : ''} title="${e(a.disabledReason || a.description)}" aria-describedby="field-preview-${e(a.id)}">${e(a.label)}${a.cost && a.cost !== 'Free' ? ` <small>${e(a.cost)}</small>` : ''}</button><p class="small-copy field-preview" id="field-preview-${e(a.id)}">${e(a.disabledReason || a.preview.summary)}${commandHelpFor(a, actor)}</p></div>`).join('')}</div>`;
  return `<div class="field-workspace"><header class="field-topline">${chapter(b.title, !live ? 'The fight is over.' : `Round ${b.round}.`, 'THE FIELD')}</header><div class="field-ground"><section class="field-side enemies" aria-label="Them">${rank('enemy', 'back')}${rank('enemy', 'front')}</section><div class="field-line" aria-hidden="true"></div><section class="field-side party" aria-label="You">${rank('party', 'front')}${rank('party', 'back')}</section></div><section class="panel field-commands" aria-label="Battle commands">${commands}<div class="field-recent" aria-live="polite">${b.log.slice(-3).map(l => `<p>${e(l)}</p>`).join('')}</div><details class="field-log"><summary>The whole of it</summary><ol class="battle-log">${b.log.map(l => `<li>${e(l)}</li>`).join('')}</ol></details></section></div>`;
}

// ---------------------------------------------------------------- above ground
import { battlecraftView, bestiaryView, treeView } from './battlecraft.js';
/** The arts of a calling, what a fight has cost, and who stands with you. Under Activities › Training. */
export function battlecraftPanel(s, e) {
  const v = battlecraftView(s); if (!v) return '';
  const parts = [];
  const tree = treeView(s);
  if (tree) {
    const tiers = [2, 3].map(t => tree.rows.filter(r => r.tier === t));
    parts.push(`<div class="schooling-row"><span class="eyebrow">THE ARTS OF THE ${e(tree.calling.toUpperCase())}</span><p class="small-copy">Your calling's two gifts are always yours${tree.roots.length ? '; the two earned techniques sit beside them' : ''}. Beyond those, ${tree.rows.filter(r => r.learned).length} of ${tree.rows.length} learned.</p><ul class="field-tree">${tiers.map((rows, i) => `<li><strong>${i === 0 ? 'Second tier' : 'Third tier'}</strong><ul>${rows.map(r => `<li class="${r.learned ? 'learned' : r.reason ? 'locked' : 'open'}"><span>${e(r.name)}</span> <small>${e(r.learned ? r.line : r.reason || 'Within reach.')}</small></li>`).join('')}</ul></li>`).join('')}</ul></div>`);
  }
  if (v.injuries.length) parts.push(`<div class="schooling-row"><span class="eyebrow">WHAT IT COST</span>${v.injuries.map(i => `<p><strong>${e(i.name)}</strong>${i.permanent ? ', for good' : `, ${i.daysLeft} day${i.daysLeft === 1 ? '' : 's'}${i.treated ? ', set and mending' : ', untended'}`}. ${e(i.line)}</p>`).join('')}</div>`);
  const people = v.companions.filter(c => c.alive);
  if (people.length) parts.push(`<div class="schooling-row"><span class="eyebrow">WHO STANDS WITH YOU</span>${people.map(c => `<p><strong>${e(c.name)}</strong>: ${c.loyalty >= 80 ? 'would follow you anywhere, and fights beside you as one' : c.loyalty >= 55 ? 'with you' : c.loyalty >= 30 ? 'with you, for now' : 'close to walking'}${c.wounded ? '; mending' : ''}.</p>`).join('')}</div>`);
  if (v.record.fights) parts.push(`<p class="small-copy">${v.record.fights} fight${v.record.fights === 1 ? '' : 's'}: ${v.record.won} won, ${v.record.lost} lost, ${v.record.fled} walked away from${v.record.settled ? `, ${v.record.settled} not worth the telling` : ''}.</p>`);
  return parts.join('');
}
/** What a life knows of what lives in the dark. */
export function bestiaryPanel(s, e) {
  const v = bestiaryView(s); if (!v || !v.rows.length) return '';
  return `<div class="schooling-row"><span class="eyebrow">THE BESTIARY</span>${v.schooled ? '<p class="small-copy">You read natural philosophy. You know what each kind fears before it shows you.</p>' : ''}<ul class="field-bestiary">${v.rows.slice(0, 24).map(r => `<li><strong>${e(r.name)}</strong> <small>${e(r.level >= 3 ? 'known' : r.level === 2 ? 'fought' : 'seen')}${r.killed ? `, ${r.killed} killed` : ''}</small>${r.description ? `<p class="small-copy">${e(r.description)}</p>` : ''}${r.habits ? `<p class="small-copy">${e(r.habits)}</p>` : ''}</li>`).join('')}</ul></div>`;
}
