import { createHash } from 'node:crypto';
import { DUNGEONS, generateDungeonDefinition, explorationActions, negotiationChecklist, applyExplorationChoice } from '../../dist/js/exploration.js';
import { initializeGear } from '../../dist/js/gear.js';

const stable = value => Array.isArray(value) ? '[' + value.map(stable).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}' : JSON.stringify(value);
const hash = value => createHash('sha256').update(stable(value)).digest('hex');

function prepared(source, seed, mode, roomId) {
  const definition = generateDungeonDefinition(seed, source.id);
  const state = { seed, phase: 'adult', timeline: { mode: 'birth' }, age: 21, day: 7665, flags: { explorationVersion: 1, herbs: 20 }, locationId: source.locationId,
    event: null, battle: null, campaign: { facts: {} }, companions: [], journal: [], factions: { villagers: 0 },
    hero: { name: 'Parity witness', path: 'warrior', specialization: 'guardian', level: 3, hp: 56, maxHp: 76, mp: 25, maxMp: 45, gold: 100, potions: 4,
      attributes: { strength: 8, agility: 6, vitality: 6, intellect: 5, willpower: 5, presence: 5 }, skills: { weapons: 12, defense: 12, arcana: 12, devotion: 12, stealth: 12, survival: 12, scholarship: 12, persuasion: 12 }, condition: null } };
  initializeGear(state); state.equipment.materials.ore = 20; state.equipment.materials.cloth = 20;
  const facts = mode === 'unheard' ? {} : { witnessHeard: true, ...Object.fromEntries(definition.rooms.filter(room => ['fight', 'boss'].includes(room.kind)).map(room => ['listened_' + room.id, true])) };
  if (mode === 'supported') Object.assign(facts, { variantProof: true, variantAid: true, proofSource: definition.rooms.find(room => room.optional).id, aidSource: definition.rooms.find(room => room.optional).id });
  state.dungeon = { id: source.id, roomId, visited: definition.rooms.map(room => room.id), cleared: [], facts, pendingRoom: null, complete: false, definition };
  return state;
}

export function authoredParityCases(api = { explorationActions, negotiationChecklist, applyExplorationChoice }) {
  const rows = [];
  for (const source of DUNGEONS) {
    for (const room of source.rooms) {
      const state = prepared(source, 'authored-helper-parity-legacy', 'unheard', room.id);
      delete state.dungeon.definition; delete state.flags.explorationVersion;
      rows.push({ key: 'legacy-offers:' + source.id + ':' + room.id, sha256: hash({ actions: api.explorationActions(state), checklist: api.negotiationChecklist(state) }) });
    }
    const seeds = new Map();
    for (let n = 0; seeds.size < 3 && n < 100; n++) { const seed = 'authored-helper-parity-' + n, definition = generateDungeonDefinition(seed, source.id); if (!seeds.has(definition.layout)) seeds.set(definition.layout, seed); }
    for (const [layout, seed] of [...seeds].sort((a, b) => a[0] - b[0])) {
      const definition = generateDungeonDefinition(seed, source.id);
      for (const room of definition.rooms) for (const mode of ['unheard', 'heard', 'supported']) {
        const state = prepared(source, seed, mode, room.id), key = `${source.id}:${layout}:${room.id}:${mode}`;
        rows.push({ key: 'offers:' + key, sha256: hash({ actions: api.explorationActions(state), checklist: api.negotiationChecklist(state) }) });
      }
      for (const room of definition.rooms) {
        const probe = prepared(source, seed, 'supported', room.id);
        for (const offered of api.explorationActions(probe).filter(row => !row.disabledReason && !/^explore_(fight|leave|route_)/.test(row.id))) {
          const state = prepared(source, seed, 'supported', room.id), records = [];
          if (room.kind === 'objective') state.dungeon.cleared = definition.rooms.filter(row => row.kind === 'boss').map(row => row.id);
          const ctx = {
            spendDays(days) { state.day += days; return days; },
            journal(...args) { records.push(['journal', ...args]); },
            setEvent(id, title, category, body, choices) { state.event = { id, title, category, body, choices }; },
            standing(id, amount) { state.factions[id] = (state.factions[id] || 0) + amount; },
            witnesses() { return []; }, touchCampaign() { records.push(['touchCampaign']); },
          };
          const result = api.applyExplorationChoice(state, `dungeon_${source.id}_${room.id}`, offered.id.slice(8), ctx);
          rows.push({ key: 'effect:' + source.id + ':' + layout + ':' + room.id + ':' + offered.id, sha256: hash({ result, state, records }) });
        }
      }
    }
  }
  return rows;
}
