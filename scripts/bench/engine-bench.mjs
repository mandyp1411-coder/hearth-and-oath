// Engine timing: age-18 start, one Age up, one ordinary action, getActions.
// Usage: node scripts/bench/engine-bench.mjs [seed]
import { performance } from 'node:perf_hooks';
import * as engine from '../../dist/js/engine.js';
import { createLifeAtAge } from '../../dist/js/new-life.js';
const seed = process.argv[2] || 'bench-seed-1';
const t = (label, fn) => { const s = performance.now(); const r = fn(); console.log(`${label}: ${(performance.now() - s).toFixed(0)} ms`); return r; };
const ta = async (label, fn) => { const s = performance.now(); const r = await fn(); console.log(`${label}: ${(performance.now() - s).toFixed(0)} ms`); return r; };
let g = await ta('createLifeAtAge(18)', () => createLifeAtAge({ seed, startAge: 18 }));
for (let n = 0; g.event && n < 20; n++) g = engine.chooseEventOption(g, g.event.choices[0].id);
const actions = t('getActions', () => engine.getActions(g));
const walk = actions.find(a => a.id === 'leisure_walk' && !a.disabled) || actions.find(a => !a.disabled && /^leisure_|^pastime_/.test(a.id));
if (walk) g = t(`chooseAction(${walk.id})`, () => engine.chooseAction(g, walk.id));
g = t('ageUp (one year, auto-choosing)', () => { let s = engine.ageUp(g); for (let n = 0; s.event && n < 40; n++) { s = engine.chooseEventOption(s, s.event.choices[0].id); if (!s.event && s.age === g.age) s = engine.ageUp(s); } return s; });
console.log(`age ${g.age}, save ${JSON.stringify(g).length.toLocaleString()} chars`);
