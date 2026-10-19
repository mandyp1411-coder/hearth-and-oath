import { healingPotionAmount } from './combat-rules.js';

// This is the existing hero potion pause rule, not a new event-resolution path.
export function fieldPotionMomentReason(state) {
  if (!state?.hero || state.phase === 'retired' || state.hero.hp <= 0) return 'There is no living character to treat.';
  const roomPause = !state.battle && !state.conversations?.pending && (state.event?.id === 'adventure_room' || state.event?.id.startsWith('dungeon_'));
  if ((Boolean(state.event || state.battle || state.conversations?.pending) && !roomPause) || state.cartography?.pending || state.timeline?.journey) return 'Finish the current moment first. In battle, use the party potion action.';
  return null;
}

/** Read only the actual current-room descriptor/snapshot, never a destination or fogged
 * room. Maze descriptors are supplied by the canonical resolver so future effective
 * room versions keep this rule aligned without a second geometry algorithm. */
export function companionFieldRoomReason(state, { mazeRoom = null, legacyDungeonRooms = [] } = {}) {
  const unsafe = 'Resolve this room’s danger or retreat to a quiet room before treating a companion.';
  if (state.maze) {
    if (!mazeRoom || mazeRoom.id !== state.maze.position || !['entrance', 'empty', 'cache', 'enemy', 'trap', 'camp', 'inscription', 'objective', 'guardian', 'witness', 'dilemma'].includes(mazeRoom.kind)) return 'This room’s treatment safety is not available. Return to a known quiet room first.';
    if (state.maze.pendingRoom != null || !(state.maze.cleared || []).includes(state.maze.position) && ['enemy', 'guardian', 'trap'].includes(mazeRoom.kind)) return unsafe;
  }
  if (state.event?.id === 'adventure_room') {
    const run = state.adventuring?.expedition;
    const kind = run?.layoutVersion === 1 ? run.chart?.floors?.[run.floor - 1]?.rooms?.[run.room]?.kind : run?.pendingKind;
    if (!run || run.pendingBattle || !kind || kind !== run.pendingKind) return 'Finish the current moment before treating a companion.';
    if (!(run.cleared || []).includes(`${run.floor}:${run.room}`) && ['battle', 'trap'].includes(kind)) return unsafe;
  } else if (state.event?.id.startsWith('dungeon_')) {
    const dungeon = state.dungeon, room = legacyDungeonRooms.find(r => r.id === dungeon?.roomId);
    if (!dungeon || state.event.id !== `dungeon_${dungeon.id}_${dungeon.roomId}` || dungeon.pendingRoom != null || !room) return 'Finish the current moment before treating a companion.';
    if (!(dungeon.cleared || []).includes(room.id) && ['fight', 'boss', 'hazard'].includes(room.kind)) return unsafe;
  }
  const run = state.rpg?.expedition, room = run?.rooms?.find(r => r.id === run.roomId);
  if (run && (run.pendingRoom != null || !room || !room.resolved && ['guardian', 'hazard'].includes(room.type))) return unsafe;
  return null;
}

// Active companions follow the hero, matching the existing contact/presence
// model. A reserve's independent location never makes it a field-care target.
function targetReason(state, target, targetId) {
  if (!target || typeof targetId !== 'string') return 'Choose a living active companion or yourself.';
  if (target.side && target.side !== 'party') return 'Choose an ally, not an opponent.';
  if (target.alive === false || state.rpg?.companionStages?.[targetId]?.status === 'dead') return 'Ordinary potions cannot treat the deceased.';
  if (targetId !== 'hero') {
    const stage = state.rpg?.companionStages?.[targetId];
    if (stage?.status === 'away') return 'This companion is away attending their own work.';
    if (stage?.status === 'departed' || target.available === false) return 'This companion is not available to the traveling party.';
    if (!target.recruited || !target.active) return 'Only companions traveling in the active party can receive field treatment. Reserves keep their own lives.';
    if (!(state.companions || []).filter(c => c.recruited && c.active).slice(0, 3).includes(target)) return 'Only the first three active companions are traveling with you.';
  }
  if (!Number.isFinite(target.hp) || !Number.isFinite(target.maxHp) || target.maxHp <= 0) return 'This person’s Health is not recorded for treatment.';
  if (target.hp <= 0) return 'A downed companion needs separate stabilization. Ordinary field potions do not revive them.';
  if (target.hp >= target.maxHp) return targetId === 'hero' ? 'Your Health is already full.' : `${target.name} is already at full Health.`;
  return null;
}

/** Pure exact quote. The engine supplies its canonical current-moment and
 * commitment reason; UI and execution use this same eligibility/effect model. */
export function quoteFieldPotion(state, targetId = 'hero', options = {}) {
  const { contextReason = null } = options;
  const target = targetId === 'hero' ? state?.hero : (state?.companions || []).find(c => c.id === targetId);
  const noPotion = !Number.isSafeInteger(state?.hero?.potions) || state.hero.potions < 1 ? 'You have no healing potions.' : null;
  const reason = fieldPotionMomentReason(state) || contextReason || (targetId === 'hero' ? noPotion : null) || targetReason(state || {}, target, targetId) || (targetId !== 'hero' ? companionFieldRoomReason(state || {}, options) : null) || noPotion;
  const amount = reason ? 0 : healingPotionAmount(target);
  return { targetId, targetName: typeof target?.name === 'string' ? target.name : 'Unknown target',
    hp: Number.isFinite(target?.hp) ? target.hp : null, maxHp: Number.isFinite(target?.maxHp) ? target.maxHp : null,
    amount, hpAfter: Number.isFinite(target?.hp) ? target.hp + amount : null,
    potionCost: reason ? 0 : 1, days: 0, disabledReason: reason };
}

/** The target ID is re-resolved and quoted against the current state. A previous
 * UI quote is never accepted as authority, and invalid actions mutate nothing. */
export function applyFieldPotion(state, targetId = 'hero', options = {}) {
  const quote = quoteFieldPotion(state, targetId, options);
  if (quote.disabledReason) return quote;
  const target = targetId === 'hero' ? state.hero : state.companions.find(c => c.id === targetId);
  target.hp += quote.amount;
  state.hero.potions -= 1;
  return quote;
}
