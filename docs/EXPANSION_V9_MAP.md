# v0.9: a different region beneath each life

Fresh regions now draw from six landforms rather than transforming one fixed map: a river basin, broken coast, highland lake country, island chain, wooded basin, or estuary. Shorelines, site positions, optional places and road connections are saved with the world. The map depicts the routes used by travel; the picture never substitutes for their actual day costs.

Each landform has irregular shores, named landmasses, streams, uplands, woods and reed country. Highland and wooded basins contain inland lakes. River basins and estuaries have joining tributaries. Archipelagos connect actual inhabited islands with ferry routes. Fresh site descriptions include small observed details—an old toll house, an unfinished letter, a returned boat’s name—rather than appending the same regional problem to every settlement.

Site placement samples the generated landform instead of using the former coordinates with jitter. All thirteen required places and two to six optional sites remain present. Sites stay at least fourteen map units inside a shore or away from a lake; attempts prioritize separation so labels and pieces remain readable. A spanning network connects every site, followed by seeded additional roads. Each road stores its real endpoints, nine points describing its winding course, and whether it crosses water. Water crossings are named ferry crossings. Day costs and danger are still the values consulted by the route planner.

## Saved geometry contract

Fresh maps use `generationVersion: 5`, retaining the existing 1000 × 700 coordinate system, nodes, terrain and landmarks. `map.atlas` contains:

```js
{
  version: 1,
  topology: 'river-basin', // six possible landforms
  name: 'The Pale Sea',
  landmasses: [{ id, name, points: [[x, y], ...] }],
  rivers: [{ id, name, points: [[x, y], ...], width }],
  ridges: [{ id, name, points: [[x, y], ...] }],
  regions: [{ id, name, x, y, type }]
}
```

Landmass polygons sit above the sea background. Terrain uses the existing `forest`, `mountain`, `marsh` and `water` types; water terrain describes inland lakes. Terrain illustrations can be clipped to the landmass polygons, keeping woods and hatch marks off the sea. `world.roads[].points` is ordered from `from` to `to`. `crossing` is `land` or `water`; the latter uses `kind: 'ferry crossing'`. Pieces and selected routes can follow the same saved polyline.

Atlas validation checks bounded geometry, unique feature IDs, permitted landforms, river widths, region labels, settlements on dry land, and road endpoints. Versions three and four remain accepted. Complete previous worlds retain their exact names, damage, roads and geometry; migration does not generate a new atlas for them.

## Verification

- Six new focused tests plus the ten existing world tests passed.
- The automated atlas test generates one hundred repeatable regions, sees all six landforms, verifies distinct shorelines and road networks, checks every settlement is on land, checks separation, and reaches every site through the real roads.
- A separate one hundred-region road test checks every saved polyline’s exact endpoints and whether its crossing classification matches water beneath it.
- Basin tributaries, island landmasses, lake exclusion, malformed atlas rejection, and exact migration continuity are covered. The migration test loads the genuine v0.8 community checkpoint.
- A supplementary one thousand-region geometry sweep passed world validation with no invalid maps. Its smallest observed separation was approximately 85.6 map units. These are generator checks, not additional completed lives.
- Ten renderer tests passed, including read-only atlas rendering, exact road geometry in both travel directions across twenty-four seeds, pawn animation on the saved polyline, safe label escaping and separate SVG IDs. Browser checks covered all six landforms at 390 and 1140 pixels, with no JavaScript errors, page overflow or location-label overlaps; map targets were at least 46 pixels. Screenshots are saved as `artifacts/map-v9-390.png` and `artifacts/map-v9-1140.png`.

The generation remains a finite authored regional framework. It adds varied geography and bearings; it does not claim an unlimited continent or that every drawn tree is an interactive destination.
