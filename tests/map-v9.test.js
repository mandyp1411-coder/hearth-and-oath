import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, findRoute } from '../dist/js/world.js';
import { renderWorldMap, getMapRouteGeometry, animateMapMovement } from '../dist/js/map.js';

const state = seed => ({ seed, world: generateWorld(seed, { expanded: true }), locationId: 'home', age: 18, phase: 'adult', timeline: { mode: 'birth' }, hero: { name: 'Merren', appearance: {} } });
const decode = text => text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('engraved atlas renders its actual shores, waterways and settlement countryside without changing a save', () => {
  const s = state('atlas-engraving-v9');
  const before = structuredClone(s);
  const html = renderWorldMap(s, { selectedId: 'city' });
  assert.deepEqual(s, before);
  assert.match(html, /map-landmass/);
  assert.match(html, /map-shoreline/);
  assert.match(html, /map-river-bank/);
  assert.match(html, /map-ridge-hachures/);
  assert.match(html, /map-settlement-engraving/);
  assert.match(html, /clip-path="url\(#map-world-\d+-land\)"/);
  assert.match(html, /map-selected-route/);
  for (const river of s.world.map.atlas.rivers) assert.ok(html.includes(`data-map-river="${river.id}"`));
  assert.equal((html.match(/data-op="map-select"/g) || []).length, s.world.locations.length);
  assert.equal(renderWorldMap(s, { selectedId: 'city' }), html, 'Opening the chart must be deterministic.');
});

test('map route geometry follows saved winding roads exactly and reverses the same waypoints', () => {
  for (let index = 0; index < 24; index++) {
    const s = state(`atlas-route-v9-${index}`);
    for (const road of s.world.roads) {
      const forward = getMapRouteGeometry(s, [road.from, road.to]);
      const backward = getMapRouteGeometry(s, [road.to, road.from]);
      assert.deepEqual(forward.points, road.points);
      assert.deepEqual(backward.points, [...road.points].reverse());
      assert.equal(forward.legs.length, 1);
    }
    const route = findRoute(s.world, 'home', 'ruin');
    const geometry = getMapRouteGeometry(s, route);
    assert.equal(geometry.legs.length, route.length - 1);
    for (let i = 1; i < geometry.legs.length; i++) assert.deepEqual(geometry.legs[i - 1].points.at(-1), geometry.legs[i].points[0]);
    const first = s.world.map.nodes.find(node => node.id === route[0]);
    const last = s.world.map.nodes.find(node => node.id === route.at(-1));
    assert.deepEqual(geometry.points[0], [first.x, first.y]);
    assert.deepEqual(geometry.points.at(-1), [last.x, last.y]);
    assert.deepEqual(getMapRouteGeometry(s, ['home', 'imaginary']), { points: [], path: '', legs: [] });
  }
});

test('the moving pawn uses the rendered road points rather than a straight line between pins', async () => {
  const s = state('pawn-road-v9'), road = s.world.roads.find(row => row.points.some((point, index) => index > 0 && index < row.points.length - 1));
  const html = renderWorldMap(s);
  const roads = JSON.parse(decode(html.match(/data-map-roads="([^"]+)"/)[1]));
  let frames, options;
  const classes = new Set();
  const board = { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } };
  const canvas = { dataset: { mapRoads: JSON.stringify(roads) }, clientWidth: 1000, clientHeight: 700, closest: () => board };
  const piece = { dataset: { locationId: road.to }, closest: () => canvas, animate: (keyframes, settings) => { frames = keyframes; options = settings; return { finished: Promise.resolve() }; } };
  await animateMapMovement({ querySelectorAll: () => [piece] }, { from: road.from, to: road.to, route: [road.from, road.to] });
  assert.equal(frames.length, road.points.length);
  const last = road.points.at(-1);
  for (let index = 0; index < frames.length; index++) {
    const [x, y] = road.points[index];
    const numbers = [...frames[index].transform.matchAll(/(-?[\d.]+)px/g)].map(match => Number(match[1]));
    assert.ok(Math.abs(numbers[0] - (x - last[0])) < 1e-8);
    assert.ok(Math.abs(numbers[1] - (y - last[1])) < 1e-8);
  }
  assert.equal(frames[0].offset, 0);
  assert.equal(frames.at(-1).offset, 1);
  assert.equal(options.easing, 'linear');
  assert.equal(classes.size, 0);
});

test('atlas text and attributes stay escaped, with isolated SVG definitions for separate boards', () => {
  const s = state('safe-atlas-v9');
  s.world.map.atlas.name = '<script>sea</script>';
  s.world.map.atlas.regions[0].name = '" onload="bad';
  s.world.map.atlas.rivers[0].name = '<img src=x onerror=bad>';
  const html = renderWorldMap(s) + renderWorldMap(s, { compact: true }) + renderWorldMap(s, { instanceId: 'second-chart' });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  for(const image of html.matchAll(/<img[^>]+src="([^"]+)"/g))assert.match(image[1],/^\.\/art\/presets\/[a-z0-9-]+\.avif$/);
  assert.match(html, /&lt;script&gt;sea/);
  assert.match(html, /&quot; onload=&quot;bad/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'The map and its portrait definitions must be namespaced.');
  for (const reference of html.matchAll(/(?:href="#|url\(#)([^\)"]+)/g)) assert.ok(ids.includes(reference[1]), reference[1]);
});

test('legacy geometry and graph remain intact while their drawn roads share the same movement path', () => {
  const s = { ...state('old-road-art-v9'), world: generateWorld('old-road-art-v9') };
  const before = structuredClone(s.world);
  for (const road of s.world.roads) {
    const geometry = getMapRouteGeometry(s, [road.from, road.to]);
    assert.equal(geometry.points.length, 13);
    assert.deepEqual(getMapRouteGeometry(s, [road.to, road.from]).points, [...geometry.points].reverse());
  }
  const html = renderWorldMap(s);
  assert.ok(!html.includes('map-landmass'));
  assert.equal((html.match(/data-map-road-from/g) || []).length, s.world.roads.length);
  assert.deepEqual(s.world, before);
});
