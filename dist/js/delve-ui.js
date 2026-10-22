// The delve on the page: the premise over the door, the room you stand in and
// what you noticed in it, the light and the pack, the noise, the rooms you
// have seen, and the doors. Reads delveView; never advances anything.
import { delveView } from './delve.js';
import { getActions } from './engine.js';
import { compactActivityRows } from './activities-v31.js';

const SYMBOL = { approach: '↟', hub: '◇', chamber: '·', secret: '≡', lair: '⚔', way: '✦' };
export function renderDelve(s, ui) {
  const v = delveView(s); if (!v) return '';
  const { e } = ui, actions = getActions(s), doors = actions.filter(a => a.id.startsWith('delve_go_')), rest = actions.filter(a => a.id.startsWith('delve_') && !a.id.startsWith('delve_go_'));
  const light = v.dark ? 'Dark. You cannot see your hand.' : `${v.light} hour${v.light === 1 ? '' : 's'} of light${v.supplies.torches ? `, ${v.supplies.torches} torch${v.supplies.torches === 1 ? '' : 'es'} in the pack` : ', and no more torches'}`;
  const pack = [`${v.supplies.rations} ration${v.supplies.rations === 1 ? '' : 's'}`, v.supplies.rope ? 'rope' : 'no rope', v.supplies.oil ? 'oil' : 'no oil', v.supplies.chalk ? 'chalk' : 'no chalk'].join(' · ');
  const rooms = v.rooms.map(r => `<li class="delve-room ${r.here ? 'here' : ''} ${r.seen ? 'seen' : 'unseen'} ${r.danger ? 'danger' : ''} ${r.cleared ? 'cleared' : ''}"><span class="delve-room-symbol" aria-hidden="true">${SYMBOL[r.kind] || '·'}</span>${e(r.seen ? r.name : '?')}${r.here ? ' <small>you are here</small>' : r.seen && r.danger ? ' <small>something lives there</small>' : ''}</li>`).join('');
  return `<div class="delve-workspace"><header class="delve-heading"><div><span class="eyebrow">${e(v.floors > 1 ? `FLOOR ${v.floor} OF ${v.floors}` : 'BELOW')}</span><h1>${e(v.title)}</h1><p class="delve-premise">${e(v.premise.built)} ${e(v.premise.wrong)}</p></div><span class="delve-vitals">Health ${s.hero.hp}/${s.hero.maxHp}</span></header>${s.event ? ui.encounter() : ''}<div class="delve-layout"><section class="delve-room-panel panel"><span class="eyebrow">${e(v.room.name.toUpperCase())}</span><p>${e(v.room.text)}</p>${v.room.noticed.length ? `<p class="delve-noticed"><strong>You notice:</strong> ${v.room.noticed.map(n => e(n.label)).join(', ')}.</p>` : ''}${v.log.length ? `<div class="delve-log">${v.log.slice(-4).map(l => `<p>${e(l)}</p>`).join('')}</div>` : ''}<div class="delve-doors">${compactActivityRows(doors, ui, s)}</div><div class="delve-acts">${compactActivityRows(rest, ui, s)}</div></section><aside class="delve-side"><section class="panel delve-pack"><span class="eyebrow">LIGHT AND PACK</span><p>${e(light)}.</p><p class="small-copy">${e(pack)}</p><p class="small-copy">${v.hours} hour${v.hours === 1 ? '' : 's'} below${v.days ? ` (${v.days} day${v.days === 1 ? '' : 's'})` : ''} · ${e(v.noiseWord)}${v.lairCleared ? ` · ${e(v.lairName)} is dead` : ''}</p></section><section class="panel delve-map"><span class="eyebrow">WHAT YOU HAVE SEEN</span><ul class="delve-rooms">${rooms}</ul>${v.finds.length ? `<p class="small-copy">Carried: ${v.finds.map(f => e(f.kind === 'page' ? 'pages' : f.name)).join(', ')}.</p>` : ''}</section></aside></div></div>`;
}
