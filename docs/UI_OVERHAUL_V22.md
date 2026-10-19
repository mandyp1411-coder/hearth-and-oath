# Hearth & Oath 0.22.0: menu and map overhaul

The prior interface placed four expanding navigation groups in a 68px strip,
stacked the current life decision above a full archive, and buried settlement
rooms below the atlas. A 720px hex canvas could crop the pawn because centering
only recognized the older map renderer.

The new game frame fills the viewport. Six frequent destinations use a compact
rail; all 17 existing views remain in the game menu. Identity, status and the
calendar command have stable regions. Long records use deliberate local scroll.
Phones give Life to the current decision and use Map / Details & actions panes
for exploration. Short viewports keep Menu and the year command reachable.

Country, Settlement and Dungeon are separate spatial layers. Public rooms,
existing services and truthful nearby people share the settlement workspace.
Contact selection is view-only; real talk and captured replies retain the engine's
time, trait effects and identity. Remote correspondence remains Letters. Pack
opens owned equipment before Merchant and Craft & sell. Combat has an independent
command panel and retains living selected targets across turns.

Paper charts draw only public known terrain and recorded roads. Compact cameras
contain the pawn, explicit zoom changes the actual canvas, and six direction
controls make movement independent of dense fitted pins. Runtime place names
remain seed/lore driven. Original portrait crops and simulation geometry remain.

`node scripts/generate-paper-maps-v22.mjs` generates 512 distinct valid-world
reference charts, with no baked place labels. Their SVGs reference one shared
original parchment image. Use a manifest seed in New life to reproduce a chart;
live maps preserve fog. This is procedural art, not 512 AI image calls. Exports
and the seed/hash manifest are delivered in the audit evidence archive.

## Verification

- Final suite: **748 passed, 0 failed**.
- Focused entry/menu/pane/v21 regression set: **37 passed, 0 failed**.
- All 17 production views opened without changing the saved simulation.
- 512 unique art and geometry hashes; no printed location names/text elements.
- 2,640 pure camera centers, 277 public pin bounds, 786 hidden-name and 790
  hidden-site assertions; 32 Country/Settlement renders; zero save mutations.
- Offline build: six parts reconstruct the 44,943,987-byte standalone game
  exactly, including its paper texture; bundled JavaScript syntax checked.
- Twelve resolution scenarios are source-derived; no live browser measurements.

The supported control-browser skill is unavailable in this managed environment.
The Sites workflow requires skipping browser QA rather than launching an
unsupported server/browser path. Actual Chrome/Firefox/Safari layout, touch,
assistive technology, software-keyboard and 200% zoom checks remain unverified.
Dense fitted pins have route/list/zoom alternatives. A versioned correction for
legacy inland-lake projection and spatial procedural descents remain future work.

The audit contains ten fictional design critic surveys, primary game references,
the resolution matrix, source rechecks, map exports and raw verification evidence.
No new human critic reviews or additional 100-life cohort are claimed.
