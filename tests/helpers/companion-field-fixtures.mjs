import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../../dist/js/engine.js';
import { mazeLayout, mazeRoomCell } from '../../dist/js/maze-v31.js';

// Controlled party/resources/current positions isolate accounting and semantic
// handlers. Admission, effect, return, retirement and succession use public
// source APIs. These are not earned-party or safe-route/balance claims.
export const copy = value => structuredClone(value);
export function valid(s) { assert.ok(E.validateSave(s), s.notice); return s; }
export function roundtrip(s) { valid(s); assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))), s); return s; }
export function drain(s) {
  for (let n = 0; s.event && n < 40; n++) {
    const c = s.event.choices.find(c => ['withdraw', 'later', 'care', 'keep', 'continue', 'pause', 'ask', 'leave'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason);
    assert.ok(c); s = E.chooseEventOption(s, c.id);
  }
  assert.equal(s.event, null); return valid(s);
}
export function action(s, id) { assert.ok(E.getActions(s).some(a => a.id === id && !a.disabledReason), id); return drain(E.chooseAction(s, id)); }
export function atGeneric(s, kind, exclude = []) {
  const room = mazeLayout(s.maze).cells.map(c => mazeRoomCell(s.maze, c.id)).find(c => c.kind === kind && !c.contentSlot && !s.maze.cleared.includes(c.id) && !exclude.includes(c.id));
  assert.ok(room, kind); s.maze.position = room.id; s.maze.previous = room.doors[0]; s.maze.visited = [...new Set([...s.maze.visited, room.id, room.doors[0]])]; return valid(s);
}
export function select(s, kind, helperId, targetId = 'hero') {
  const a = E.getActions(s).find(a => a.fieldAssist?.kind === kind && a.fieldAssist.helperId === helperId && a.fieldAssist.targetId === targetId);
  assert.ok(a, `${kind}/${helperId}/${targetId}`); return a;
}
let base;
export function roomFixture(kind = 'scout') {
  if (!base) base = valid(E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/v30-explore-travel.json.gz', import.meta.url)))).states.base));
  let s = copy(base); s.hero.hp = Math.min(30, s.hero.maxHp); s.hero.mp = Math.min(8, s.hero.maxMp); s.hero.gold = 1000; s.adventuring.rations = 10; s.flags.herbs = 2;
  const helperId = { scout: 'kest', protector: 'mira', scholar: 'orrin', healer: 'sable' }[kind];
  for (const p of s.companions) { p.active = p.recruited = p.id === helperId; if (p.id === helperId) { p.hp = Math.min(20, p.maxHp); p.mp = p.maxMp; s.rpg.companionStages[p.id].status = 'available'; } }
  // Select a real generated run containing this controlled room antecedent.
  // Short descents need not contain every room type; no room is invented.
  const source=copy(valid(s)),roomKind=['scout','protector'].includes(kind)?'trap':kind==='scholar'?'inscription':'camp';let found=false;
  for(let run=source.mazeBook.nextRun;run<source.mazeBook.nextRun+40;run++){
    // A regional descent is a maze for every life; the board's descent is a delve (v0.72.3).
    s=copy(source);s.mazeBook.nextRun=run;s=action(valid(s),'rpg_enter_modular_1');
    if(mazeLayout(s.maze).cells.some(c=>{const room=mazeRoomCell(s.maze,c.id);return room.kind===roomKind&&!room.contentSlot&&!s.maze.cleared.includes(c.id);})){found=true;break;}
  }
  assert.ok(found,'a bounded set of native runs contains '+roomKind);s=atGeneric(s,roomKind);
  s.hero.attributes.agility = 6; s.hero.skills.survival = 8 + 2 * s.maze.tier - 7; return roundtrip(s);
}
export function unchangedExceptNotice(next, before) { const normalized = copy(next); normalized.notice = before.notice; assert.deepEqual(normalized, before); }
export function realParent() {
  let s = drain(valid(E.migrateSave(JSON.parse(readFileSync(new URL('../fixtures/v21-vampire-grievance-paused.json', import.meta.url))))));
  assert.ok(s.life.children.some(c => c.id === 'child-1' && c.age >= 18)); if (s.hero.condition?.type === 'vampire') s.hero.condition.hunger = 0;
  s.hero.hp = s.hero.maxHp; s.hero.mp = s.hero.maxMp; s.hero.gold = 1000;
  for (const p of s.companions) { p.active = p.recruited = p.id === 'kest'; if (p.id === 'kest') { p.hp = p.maxHp; p.mp = p.maxMp; s.rpg.companionStages[p.id].status = 'available'; } }
  // The actual parent lives at home; cistern's canonical entry is at marsh.
  // Use an enabled native source offer, as the existing public-successor gate
  // does, rather than moving a source or bypassing its availability conditions.
  const entry = E.getActions(valid(s)).find(a => a.id.startsWith('rpg_enter_signature_') && !a.disabledReason);
  assert.ok(entry, 'the actual parent settlement has an enabled public signature descent');
  s = action(s, entry.id); assert.equal(s.maze.version, 2); s = atGeneric(s, 'trap'); s.hero.attributes.agility = 6; s.hero.skills.survival = 8 + 2 * s.maze.tier - 7; return roundtrip(s);
}
