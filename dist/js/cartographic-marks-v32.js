/**
 * Reusable pen-and-ink atlas drawings. Coordinates are centered on the ground
 * line, with most marks between 16 and 36 units wide. The compass is centered.
 * Colors are inherited; callers can style the cartographic-* classes.
 */

const KINDS = Object.freeze({
  city: 'city', village: 'village', settlement: 'village',
  harbor: 'harbor', harbour: 'harbor', port: 'harbor', coast: 'harbor',
  citadel: 'citadel', castle: 'citadel', fortress: 'citadel', gate: 'gate',
  tower: 'tower', shrine: 'shrine', sanctuary: 'shrine', temple: 'shrine',
  camp: 'camp', ruin: 'ruin', ruins: 'ruin', mine: 'mine',
  mountain: 'peak', peak: 'peak', tree: 'tree', forest: 'tree',
  pine: 'pine', conifer: 'pine', hill: 'hill', reed: 'reed', marsh: 'reed',
  compass: 'compass', boat: 'boat', ship: 'boat', 'sailing-boat': 'boat'
});

const VARIANTS = Object.freeze({ tree: 3, pine: 3, peak: 3, hill: 3 });

function safePrefix(prefix) {
  return String(prefix ?? 'atlas').toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'atlas';
}

function coordinate(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : fallback;
}

function definition(prefix, name, drawing) {
  return `<g id="${prefix}-${name}" class="cartographic-ink cartographic-${name}" fill="none" stroke="currentColor" stroke-width="0.72" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
}

/** Return SVG definition contents, to place inside the caller's <defs>. */
export function cartographicDefinitions(prefix = 'atlas') {
  const p = safePrefix(prefix);
  const drawings = {
    city: `
      <path d="M-18 1q7-2 13-1t23 0M-16-1v-10l4-4 4 4v10m-8-10h8M-11-1v-18l5-5 5 5v18m-10-18h10M-2-1v-13l4-4 4 4v13m-8-13h8M7-1v-23l3-3 3 3v23m-6-23h6M12-1v-12l4-4 3 4v13m-7-13h7"/>
      <path d="M-17-1h35M-13-10v3m2-3v3M-8-17v3m4-3v3m-4 3v3m4-3v3M1-12v3m3-3v3M9-22v3m2-3v3m-2 3v3m2-3v3M15-11v3m2-3v3M-7-1v-4q1-2 2 0v4M9-1v-5q1-2 2 0v5"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-15-11 3-3m1 3 1-1m0-6 4-4m-1 4 3-3m3 7 3-3m6-7 2-2m4 12 2-2M-15 3h8m3 0h8m5 0h5"/>`,
    village: `
      <path d="M-17 1q8-2 17 0t17-1M-14-1v-8h8v8m-10-8 6-6 6 6zM-3-1v-13h10v13M-5-14l7-7 7 7zM9-1v-7h6v7m-8-7 5-5 5 5z"/>
      <path d="M-11-1v-4h2v4m8 0v-7h3v7M3-12v3m3-3v3M11-6v2M4-19v-4h2v6"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-14-9 4-4m-1 4 3-3m5-2 5-5m-1 5 4-4m4 10 3-3M-13 3h7m6 0h7m5-1h4"/>`,
    harbor: `
      <path d="M-18-2h31M-16-3v-11h8v11m-10-11 6-5 6 5zM-6-3v-8h11v8m-13-8 7-6 8 6zM-13-10v3m3-3v3m7-1v5h4v-5M6-2v4m6-4v4M3 0h14m-1-2v4"/>
      <path d="M-17 4q3-2 6 0t6 0m1 2q3-2 6 0t6 0m1-2q3-2 6 0M8-4l2 2h7l2-2zM13-4v-11l-4 9h4m1-8 4 8h-4"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-16-14 4-3m-1 3 3-2m-6 3v7m10-5 5-4m-1 4 4-3M-17 1h9"/>`,
    citadel: `
      <path d="M-18 1q8-2 18 0t18-1M-16 0v-19h2v-3h2v3h2v-3h2v3h2V0m-10-16h10M6 0v-19h2v-3h2v3h2v-3h2v3h2V0M6-16h10M-6-2v-11h12v11m-12-11v-3h2v3h3v-3h2v3h3v-3h2v3"/>
      <path d="M-3 0v-7q3-5 6 0v7M-12-14v3m3-3v3m6 2h2m4 0h2M9-14v3m3-3v3M-15-4h3m-3-3h2m20 2h3m-2-3h3"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="M-15-16v8m3-8v5M7-16v8m3-8v5M-5-10v7M4-10v7M-15 3h9m12 0h8"/>`,
    gate: `
      <path d="M-17 1q8-2 17 0t17-1M-15 0v-16l4-4 4 4V0M-17-16h12M7 0v-16l4-4 4 4V0M5-16h12M-7-3v-9h14v9M-4 0v-6q4-7 8 0v6"/>
      <path d="M-12-13v3m3-3v3m18-3v3m3-3v3M-3-5h6m-6 2h6M-2-6v6m2-8v8m2-6v6M-7-10h14"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-14-16 3-3m1 3 1-1m17 1 3-3m1 3 1-1M-14-8v6m3-6v4m19-4v6m3-6v4M-15 3h8m14 0h8"/>`,
    tower: `
      <path d="M-10 1q10-3 20 0M-6 0l1-23h-2l7-7 7 7H5L6 0M-5-22H5M-5-19H5M-2 0v-6q2-3 4 0v6M0-17v4m0-3h1M0-30v-4l5 1-5 2"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-5-23 5-5m-2 5 4-4M-4-18v7m2-7v5M-5-6v4m8-6v6M-7 3h14"/>`,
    shrine: `
      <path d="M-15 1q7-2 15-1t15 0M-11-1v-12h22v12M-14-13 0-22l14 9zM-13 0h26M-3 0v-8q3-5 6 0v8M-8-11v5m16-5v5M-2-23v-6h4v6M-4-29l4-4 4 4z"/>
      <path d="M-9-11h2m0 5h-2m16-5h2m0 5H7M-2-29h4M0-19v3m-2-1h4M-2-6h4M-12 3h24"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-11-13 11-7m-7 7 9-6m-4 6 7-4M-10-10v6m2-4v4M10-10v6M-2-31l2-1"/>`,
    camp: `
      <path d="M-17 1q8-2 17 0t17-1M-16-1l7-14 8 14zM-9-15l1 14m-1-11 4 11M3-1l6-10 7 10zM9-11v10m0-8 4 8M-17-1h17m2 0h15M-10-17l1 2 2-2M8-13l1 2 2-2"/>
      <path d="m-3 4 6-2m-6 0 6 2M-1 1q-3-3 0-5-1 3 2 3 2-1 1-3 4 4 0 5M0-7q-2-2 0-4"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-15-1 5-11m-3 11 3-7m14 7 4-7m-2 7 3-5"/>`,
    ruin: `
      <path d="M-18 1q10-2 18 0t18-1M-15 0v-20l3 1 1-3 3 2v4l2-1v17M-6-1v-10l3-1 1 2 4-1 1-4h3v15M9 0v-10l2 1v-4h4v13M-15-15h7M-15-12h4m2 3h3M-2-1v-4q2-4 4 0v4M-15-7h3m2 3h3m8-4h3m6 4h2"/>
      <path d="m-18 0 2-3 3 3m16 1 2-4 3 3M-5 2l2-2 3 2M-11-19l1 4-2 3 1 5m24-5-1 5"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="M-14-19v5m2 2v5m7-3v7m10-9v7m5-6v4M-15 4h8m4-1h6m6 1h7"/>`,
    mine: `
      <path d="M-18 1-8-19l4 5 6-14L18 1M-11 0v-9l4-4h8l4 4v9M-11-9H5M-9-8v8m12-8v8M-7 0v-5q3-5 6 0v5M-6-24l4-4 5 8M-9-16l2-3 3 5"/>
      <path d="m6-9 4 1 4 9M6-6l4 2 2 5M-17 3h12m5 0h18M-6 0l-3 4m7-4 3 4M-10 3H2m-9-2h6"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-16 0 7-15M4-23l9 20M6-17l7 15M-7-10v2m3-2v2m3-2v2M-6-4v4m2-6v6m2-5v5"/>`,
    'tree-0': `
      <path d="M-8 0q8-2 16 0M-1-1l1-12 2 12m-2-7-4-4m5 2 4-4M-5-9q-7-1-5-6-2-4 3-6 0-5 5-5 3-4 6 0 5-1 6 4 5 2 3 6 2 5-4 6-2 3-6 1-4 3-8 0z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="M-9-17q2 3 5 2m-2-6q1 3 4 3m4-5q0 3 3 3m0 4q2 2 5 0M-5-12l2 1m7-2 2-1M-1-6v4"/>`,
    'tree-1': `
      <path d="M-9 0q9-2 18 0M-1-1l1-10 1 10m-1-6-5-5m6 3 4-3M-6-9q-6-1-5-5-3-4 1-7 1-5 5-4 4-5 7-1 5-3 7 2 6 1 4 6 3 4-2 7-2 4-7 2-4 3-7 0z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="M-10-19q2 3 5 2m-2-5q2 2 4 1m2-4q0 3 3 4m3-1q3 2 5 0m-2 7 3-1M-6-12l3 1m5-3 2 1M0-6v4"/>`,
    'tree-2': `
      <path d="M-8 0q8-2 16 0M-1-1l1-9 2 9m-2-6-4-3m5 1 4-3M-5-8q-6 0-5-4-4-3 0-6-1-4 3-5 2-4 6-2 4-3 6 1 5 0 5 5 4 3 0 6 0 4-5 4-4 3-7 1z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="M-9-16q2 2 5 1m-2-6q2 2 4 1m3-3 2 3m2 2q1 2 4 1m-3 6 3-1M-5-10l2 1m4-2 3 1M-1-5v3"/>`,
    'pine-0': `
      <path d="M-8 0q8-2 16 0M-1 0v-7h2v7M0-29l-5 9h3l-6 8h4l-6 7q10 3 20 0l-6-7h4l-6-8h3z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-3-21 2-4m-4 11 4-7m-6 13 6-10m-3 11 3-6m3 8 2 1m0-7 2 1"/>`,
    'pine-1': `
      <path d="M-7 0q7-2 14 0M0 0v-7M0-32l-4 9h2l-5 9h3l-5 8q9 2 18 0l-5-8h3l-5-9h2z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-2-24 1-3m-3 11 3-6m-5 13 5-10m-2 11 2-5m4 6 2 1m-3-8 1 2"/>`,
    'pine-2': `
      <path d="M-9 0q9-2 18 0M-1 0v-7h2v7M0-26l-5 8h3l-7 7h4l-6 6q11 3 22 0l-6-6h4l-7-7h3z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="m-3-19 2-3m-5 10 5-7m-7 12 7-9m-4 10 4-5m4 5 3 1m-4-8 2 1"/>`,
    'peak-0': `
      <path d="M-17 1-2-29 16 1M-6-21l4-8 5 9-4-3-3 4zM-2-22-4-10l-4 5-2 6m8-23 4 10 2 3 4 10M-17 2q10-2 18 0t16-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m-14-1 8-17m-5 18 6-13m-2 14 3-8m7-10 8 17M5-9l4 9m-4-3 1 3M-12 4h7m4 0h9m3-1h4"/>`,
    'peak-1': `
      <path d="M-18 1-6-21l4 5 7-17L19 1M1-24l4-9 5 12-5-4-3 4zM-10-14l4-7 4 5-4-2-2 5M5-25 2-13l2 7-2 7m3-26 5 13 2 3 3 10M-18 2q10-2 18 0t19-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m-15 0 8-16m-5 16 6-12m-3 13 4-8m12-14 8 19M8-13l6 13M-14 4h9m4 0h9m4-1h5"/>`,
    'peak-2': `
      <path d="M-17 1-4-24 1-17l5-9L18 1M-7-18l3-6 5 7-4-3-3 4M3-21l3-5 4 8-4-3-2 2M-4-20l-1 11-4 10m9-15 4 7 1 8M6-21l5 12 1 10M-17 2q8-2 17 0t18-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m-14 0 7-14m-4 14 5-10m-2 10 2-5m12-10 6 13M7-9l4 9m-8-6 2 5M-12 4h8m4 0h8m4-1h4"/>`,
    'hill-0': `
      <path d="M-17 0q8-19 16-7 8-12 18 7M-17 2q9-2 17 0t17-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m-13-1 2-4m1 4 3-7m1 7 2-5m7 5 2-5m1 5 2-6m1 6 2-3M-12 4h8m4 0h12"/>`,
    'hill-1': `
      <path d="M-17 0q10-23 20-5 8-5 14 5M-17 2q9-2 17 0t17-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m-13-1 2-5m1 5 3-8m1 8 2-7m1 7 1-3m8 3 1-2m2 2 1-1M-12 4h8m4 0h12"/>`,
    'hill-2': `
      <path d="M-18 0q6-12 12-6Q6-25 18 0M-18 2q9-2 18 0t18-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m-14-1 2-3m1 3 2-4m5 4 3-7m0 7 3-10m0 10 2-9m1 9 2-5m1 5 2-3M-13 4h8m5 0h13"/>`,
    reed: `
      <path d="M-12 1q5-2 10 0m4 1q5-2 10 0M-6-1l-1-16m0 6-4-4m5 9 4-5M1 0l1-20m0 12 4-6M8 0l1-12m-1 8 4-4M-8-19l1 6 1-6zM1-23l1 7 1-7zM8-15l1 6 1-6zM-2 0l-1-6M5 0l-1-5"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="M-13 4h7m3-1h6m4 2h6M-5-5l2 3m6-8L2-5"/>`,
    compass: `
      <circle r="10" stroke-opacity="0.58"/>
      <circle r="2"/>
      <path d="M0-18 3-3 18 0 3 3 0 18-3 3-18 0-3-3zM0-18V-2M18 0H2M0 18V2M-18 0h16M-10-10l8 6m4-1 8-5m0 20-8-6m-4 1-8 5"/>
      <path fill="currentColor" stroke="none" fill-opacity="0.3" d="M0-18 3-3 0-2zM18 0 3 3 2 0zM0 18-3 3 0 2zM-18 0-3-3-2 0z"/>
      <path class="cartographic-hatch" stroke-opacity="0.48" d="M-2-9h2m-3 3h3m9 4v2M6-3v3M2 9H0m3-3H0m-9 2v-2m3 3V0"/>`,
    boat: `
      <path d="M-17-1q5 7 12 7H8q5-2 8-7L7 1H-9zM-2 0v-30M-1-28l12 23H-1zM-4-25-14-5h10zM-2-30l6 2-6 1M-15 9q4-2 8 0t8 0m3 2q4-2 8 0t8 0"/>
      <path d="m-13 1 3 2H8l4-2M-1-25 8-7M-5-22l-7 16M-2-5l-7 6m7-6 9 6M-2-29l-14 28m14-28L16-1"/>
      <path class="cartographic-hatch" stroke-opacity="0.42" d="m1-23 5 12m-5-7 3 7m-9-8-4 10M-9 4H5"/>`
  };
  return Object.entries(drawings).map(([name, drawing]) => definition(p, name, drawing)).join('');
}

/**
 * Draw a mark using the matching definitions. Unknown kinds use a village.
 * Variants wrap deterministically; nonfinite coordinates fall back to zero.
 */
export function cartographicMark(kind, x, y, scale = 1, prefix = 'atlas', variant = 0) {
  const key = String(kind).toLowerCase();
  const name = Object.hasOwn(KINDS, key) ? KINDS[key] : 'village';
  const count = VARIANTS[name] || 1;
  const integer = Math.trunc(coordinate(variant));
  const selected = ((integer % count) + count) % count;
  const id = `${safePrefix(prefix)}-${name}${count > 1 ? `-${selected}` : ''}`;
  const size = Math.max(0.01, coordinate(scale, 1));
  return `<use class="cartographic-mark cartographic-mark-${name}" href="#${id}" xlink:href="#${id}" transform="translate(${coordinate(x)} ${coordinate(y)}) scale(${size})" aria-hidden="true"/>`;
}
