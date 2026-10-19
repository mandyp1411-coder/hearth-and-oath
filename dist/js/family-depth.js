import { seededRoll } from './world.js';
import { normalizePreferences, PREFERENCE_OPTIONS } from './preferences.js';

const clamp = n => Math.max(0, Math.min(100, n));
const words = (key, value) => PREFERENCE_OPTIONS.find(f => f.key === key)?.options.find(o => o.value === value)?.label || value;
const traits = { kind: 'mercy', driven: 'ambition', reserved: 'freedom', bold: 'duty' };
const living = p => p && p.alive !== false;

// These are individual tastes, never an attractiveness or soulmate score.
export function initializeRelationshipDepth(s) {
  if (!s.life) return;
  s.life.relationshipVersion = 1;
  for (const p of s.life.people) {
    if (p.compatibility) continue;
    const preferences = normalizePreferences(Object.fromEntries(PREFERENCE_OPTIONS.map(f => [f.key, f.key === 'value' ? traits[p.disposition] || 'duty' : f.options[seededRoll(s.seed, `relationship-${s.dynasty?.generation || 1}-${p.id}-${f.key}`, f.options.length)].value])));
    p.compatibility = { preferences, known: [], history: [], lastDiscussionDay: null };
  }
}

export function compatibilityView(s, person) {
  const p = typeof person === 'string' ? s.life?.people.find(p => p.id === person) : person;
  const c = p?.compatibility;
  if (!c) return { enabled: false, summary: 'Their individual preferences have not been discussed.', known: [], shared: [], differences: [], memories: [...(p?.memories || [])].slice(-5), history: [], discussActionId: p ? `life_values_${p.id}` : null };
  const yours = normalizePreferences(s.hero.preferences);
  const known = PREFERENCE_OPTIONS.filter(f => c.known.includes(f.key)).map(f => ({ key: f.key, label: f.label, value: words(f.key, c.preferences[f.key]), yourValue: words(f.key, yours[f.key]), shared: c.preferences[f.key] === yours[f.key] }));
  const shared = known.filter(r => r.shared).map(r => `${r.label}: ${r.value}`);
  const differences = known.filter(r => !r.shared).map(r => `${r.label}: ${r.value}; you favor ${r.yourValue}`);
  return { enabled: true, summary: known.length ? `${p.name}'s known preferences are remembered. Shared tastes can make time together easier; differences remain topics for discussion, never a verdict on the relationship.` : `${p.name}'s values and tastes are still unknown. Ask and listen before assuming.`, known, shared, differences, memories: [...(p.memories || [])].slice(-5), history: [...c.history], discussActionId: `life_values_${p.id}` };
}

export function compatibilityConversation(s, person, topicId, responseId, {revealOne=false}={}) {
  const p = typeof person === 'string' ? s.life?.people.find(p => p.id === person) : person;
  if (!living(p) || !p.compatibility) return { bondDelta: 0, text: '' };
  const c = p.compatibility, respects = !['dismiss', 'demand', 'mock', 'threaten'].includes(responseId);
  const aligns = responseId === c.preferences.value || responseId === c.preferences.socialStyle || responseId === c.preferences.pursuit;
  const bondDelta = respects ? aligns ? 4 : 2 : -7;
  if (topicId === 'values') {
    const next=PREFERENCE_OPTIONS.find(f=>!c.known.includes(f.key));
    c.known = revealOne?[...c.known,...(next?[next.key]:[])]:PREFERENCE_OPTIONS.map(f => f.key);
    c.lastDiscussionDay = s.day;
  }
  const learned=revealOne&&topicId==='values'?c.known.at(-1):null;
  const detail=learned?` ${PREFERENCE_OPTIONS.find(f=>f.key===learned).label}: ${words(learned,c.preferences[learned])}. Other wishes remain theirs to share in later conversations.`:'';
  const text = (!respects ? `${p.name} remembers having their wishes dismissed; affection does not remove their boundaries.` : aligns ? `${p.name} recognizes a value you chose to practice together.` : `${p.name} remembers that you listened without requiring identical tastes or beliefs.`)+detail;
  c.history.push({ day: s.day, topic: topicId, choice: responseId, text }); c.history = c.history.slice(-30);
  p.bond = clamp(p.bond + bondDelta);
  if (!p.memories.includes(text)) p.memories.push(text);
  p.memories = p.memories.slice(-30);
  return { bondDelta, text };
}

export function relationshipDepthReason(s, p) {
  if (!living(p)) return 'Their memories remain; a deceased person cannot take part in a new discussion.';
  if (s.age < 6) return 'A conversation about individual values opens at age six.';
  if (p.locationId && p.locationId !== s.locationId) return `Meet them at ${s.world.locations.find(l => l.id === p.locationId)?.name || p.locationId}.`;
  const last = p.compatibility?.lastDiscussionDay;
  if (Number.isSafeInteger(last) && s.day - last < 30) return `Make room for their own life; a new values discussion opens in ${30 - (s.day - last)} days.`;
  return null;
}

export function validateRelationshipDepth(p, s) {
  const c = p.compatibility;
  if (c === undefined) return true;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  const normalized = normalizePreferences(c.preferences);
  if (!c.preferences || Object.keys(c.preferences).length !== 4 || Object.entries(normalized).some(([k,v]) => c.preferences[k] !== v)) return false;
  if (!Array.isArray(c.known) || c.known.length > 4 || new Set(c.known).size !== c.known.length || c.known.some(k => !PREFERENCE_OPTIONS.some(f => f.key === k))) return false;
  if (!(c.lastDiscussionDay === null || Number.isSafeInteger(c.lastDiscussionDay) && c.lastDiscussionDay >= 0 && (!s || c.lastDiscussionDay <= s.day))) return false;
  return Array.isArray(c.history) && c.history.length <= 30 && c.history.every(h => h && Number.isSafeInteger(h.day) && h.day >= 0 && (!s || h.day <= s.day) && ['topic','choice','text'].every(k => typeof h[k] === 'string' && h[k].length <= 1000));
}
